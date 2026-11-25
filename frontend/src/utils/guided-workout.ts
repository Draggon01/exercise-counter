import {ScreenLock} from "./screen-lock";

/** What the workout needs to know of a step. */
export interface WorkoutStep {
    stepId: string;
    sets: number | null;
    durationSeconds: number | null;
    restSeconds: number | null;
}

/** One part of the workout: a set of a step, the rest before the next one, or a countdown to get into position. */
export interface WorkoutPhase {
    kind: "work" | "rest" | "ready";
    /** index of the step; of the upcoming one while resting / getting ready */
    step: number;
    /** 1-based; of the upcoming set while resting / getting ready */
    set: number;
    sets: number;
    /** ends by itself; undefined: waits for "Next" */
    seconds?: number;
}

/**
 * The sets of all steps, with rests in between (none after the last set of the workout).
 * @param getReady seconds to get into position before a step that starts its timer without a rest before it; 0 = none
 */
export function workoutPhases(steps: readonly WorkoutStep[], getReady = 0): WorkoutPhase[] {
    const work = steps.flatMap((step, i) => {
        const sets = step.sets ?? 1;
        return Array.from({length: sets}, (_, set): WorkoutPhase =>
            ({kind: "work", step: i, set: set + 1, sets, seconds: step.durationSeconds ?? undefined}));
    });
    return work.flatMap((phase, i): WorkoutPhase[] => {
        const rest = steps[phase.step].restSeconds;
        const rested = i > 0 && steps[work[i - 1].step].restSeconds;
        const ready = getReady > 0 && !rested && phase.set === 1 && phase.seconds !== undefined;
        return [
            ...(ready ? [{...phase, kind: "ready" as const, seconds: getReady}] : []),
            phase,
            ...(rest && i < work.length - 1 ? [{...work[i + 1], kind: "rest" as const, seconds: rest}] : []),
        ];
    });
}

/** A shuffled copy (Fisher–Yates). */
export function shuffle<T>(list: readonly T[], random: () => number = Math.random): T[] {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/** The steps in the user's stored order: deleted steps are dropped, new ones follow the step they follow at the creator's. */
export function applyOrder<T extends { stepId: string }>(steps: readonly T[], order: readonly string[] | undefined): T[] {
    if (!order) return [...steps];
    const result = [...new Set(order)].flatMap(id => steps.filter(step => step.stepId === id));
    steps.forEach((step, i) => {
        if (result.includes(step)) return;
        result.splice(i === 0 ? 0 : result.indexOf(steps[i - 1]) + 1, 0, step);
    });
    return result;
}

/**
 * Runs through the phases, without UI. Measures against the clock like `Countdown`, so phases that ended while the
 * app was in the background are caught up. Paused time does not count.
 */
export class GuidedRun {
    index = 0;
    running = false;
    finished = false;

    /** Called when the next phase started, or the workout finished, by itself or with "Next" (not when going back). */
    onPhase: () => void = () => undefined;

    private elapsedMs = 0;
    private phaseMs = 0;
    private last = 0;
    private interval?: ReturnType<typeof setInterval>;
    private readonly screenLock = new ScreenLock();
    private readonly listeners = new Set<() => void>();

    constructor(readonly phases: readonly WorkoutPhase[]) {
    }

    get phase(): WorkoutPhase {
        return this.phases[this.index];
    }

    /** Workout time without pauses. */
    get secondsElapsed() {
        return Math.floor(this.elapsedMs / 1000);
    }

    /** Undefined if the phase waits for "Next". */
    get secondsLeft(): number | undefined {
        const seconds = this.phase.seconds;
        return seconds === undefined ? undefined : Math.ceil(seconds - this.phaseMs / 1000);
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    start() {
        if (this.running || this.finished || this.phases.length === 0) return;
        this.running = true;
        this.last = Date.now();
        this.interval = setInterval(this.tick, 250);
        this.screenLock.on();
        this.changed();
    }

    pause() {
        if (!this.running) return;
        this.tick();
        this.stop();
        this.changed();
    }

    /** Ends the phase now. */
    next() {
        if (this.finished) return;
        const before = this.index;
        this.tick();
        if (this.finished || this.index !== before) return; // it just ended by itself
        this.advance();
        this.onPhase();
        this.changed();
    }

    /** Back to the previous set (rests are skipped; with its countdown to get ready). */
    previous() {
        if (this.finished) return;
        this.tick();
        if (this.finished) return;
        let index = this.index - 1;
        while (index >= 0 && this.phases[index].kind !== "work") index--;
        if (index > 0 && this.phases[index - 1].kind === "ready") index--;
        this.index = Math.max(0, index);
        this.phaseMs = 0;
        this.changed();
    }

    /** Catches up with the clock. */
    readonly tick = () => {
        if (!this.running) return;
        const now = Date.now();
        let ms = Math.max(0, now - this.last);
        this.last = now;
        let newPhase = false;
        while (!this.finished) {
            const left = this.phase.seconds === undefined ? Infinity : this.phase.seconds * 1000 - this.phaseMs;
            const used = Math.min(ms, left);
            this.elapsedMs += used;
            this.phaseMs += used;
            ms -= used;
            if (this.phase.seconds === undefined || used < left) break;
            this.advance();
            newPhase = true;
        }
        if (newPhase) this.onPhase();
        this.changed();
    }

    private advance() {
        if (this.index === this.phases.length - 1) {
            this.finished = true;
            this.stop();
            return;
        }
        this.index++;
        this.phaseMs = 0;
    }

    private stop() {
        this.running = false;
        clearInterval(this.interval);
        this.interval = undefined;
        this.screenLock.off();
    }

    private changed() {
        this.listeners.forEach(listener => listener());
    }
}
