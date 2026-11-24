import {css, html, LitElement, nothing} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";
import {touchStyles} from "../../../styles/touch";
import {formatDuration, formatTarget} from "../../../utils/format";
import {GuidedRun, workoutPhases} from "../../../utils/guided-workout";
import {getTimerSound, vibrate} from "../../../utils/preferences";
import {playStepSound, playTimerSound} from "../../../utils/sounds";
import {ExerciseStepDto} from "../models/exerciseDetailsDto";
import "../../../components/confirm-dialog";

/** Events of `<guided-workout>`. */
export const GuidedWorkoutEvents = {
    /** detail: workout time in seconds so far, whenever it should be saved (paused, finished, left, app hidden) */
    progress: "workout-progress",
    /** "Mark as done" at the end, without detail (a `workout-closed` follows) */
    markDone: "mark-done",
    /** without detail */
    closed: "workout-closed",
} as const;

/** Full screen: leads through the steps. Starts when it is added, with the steps it has then. */
@customElement("guided-workout")
export class GuidedWorkout extends LitElement {

    static styles = [touchStyles, css`
        .screen {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            padding: calc(var(--app-space-3) + env(safe-area-inset-top)) var(--app-space-4) calc(var(--app-space-4) + env(safe-area-inset-bottom));
            background: var(--app-bg);
            color: var(--app-text);
            outline: none;
            --ring-size: min(70vw, 40vh, 320px);
        }

        .top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 44px;
            color: var(--app-text-muted);
        }

        .top sl-icon-button {
            font-size: 1.3rem;
        }

        .content {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overscroll-behavior: contain;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--app-space-4);
            padding: var(--app-space-3) 0;
            text-align: center;
        }

        /* centered, but scrollable from the top when it does not fit */
        .content > :first-child {
            margin-top: auto;
        }

        .content > :last-child {
            margin-bottom: auto;
        }

        h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
            overflow-wrap: anywhere;
        }

        .muted {
            color: var(--app-text-muted);
        }

        .hints {
            margin: 0;
            max-width: 560px;
            white-space: pre-line;
            overflow-wrap: anywhere;
            color: var(--app-text-muted);
        }

        sl-progress-ring {
            flex-shrink: 0;
            --size: var(--ring-size);
            --track-width: 12px;
            --indicator-width: 12px;
            --track-color: var(--app-chart-track);
            --indicator-color: var(--app-accent);
        }

        .rest sl-progress-ring {
            --indicator-color: var(--app-warning);
        }

        .big {
            font-size: clamp(2.5rem, 13vw, 4.5rem);
            font-weight: 700;
            font-variant-numeric: tabular-nums;
        }

        .ring {
            font-family: var(--app-font-mono);
            /* has to fit into the ring: "10:00", "1:00:00" */
            font-size: calc(var(--ring-size) * 0.24);
        }

        .ring.long {
            font-size: calc(var(--ring-size) * 0.17);
        }

        .finished {
            color: var(--app-success);
        }

        .controls {
            display: grid;
            grid-template-columns: auto 1fr 1fr;
            gap: var(--app-space-3);
            width: 100%;
            max-width: 560px;
            margin: 0 auto;
        }

        .controls.end {
            grid-template-columns: 1fr;
        }

        .controls sl-button::part(base) {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 56px;
        }
    `];

    @property({attribute: false})
    steps: ExerciseStepDto[] = [];

    /** Title of the exercise. */
    @property()
    label = "";

    /** Offer "Mark as done" at the end. */
    @property({type: Boolean})
    offerDone = false;

    @state()
    private confirmEnd = false;

    @query(".screen")
    private screen?: HTMLElement;

    private run?: GuidedRun;
    private reported = 0;
    private resumeAfterConfirm = false;

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener("keydown", this.onKeydown, {capture: true});
        document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener("keydown", this.onKeydown, {capture: true});
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
        this.run?.pause();
        this.report();
    }

    protected willUpdate() {
        if (this.run || this.steps.length === 0) return;
        this.run = new GuidedRun(workoutPhases(this.steps));
        this.run.onPhase = this.phaseStarted;
        this.run.start();
        this.run.subscribe(() => this.requestUpdate());
    }

    protected firstUpdated() {
        this.screen?.focus(); // the page behind is inert
    }

    render() {
        const run = this.run;
        if (!run) return nothing;
        return html`
            <div class="screen ${run.phase.kind}" role="dialog" aria-modal="true" aria-label="Guided workout: ${this.label}" tabindex="-1">
                <div class="top">
                    <span>${run.finished ? this.label : `Step ${run.phase.step + 1} of ${this.steps.length}`}</span>
                    <sl-icon-button name="x-lg" label="${run.finished ? "Close" : "End workout"}" @click="${this.requestClose}"></sl-icon-button>
                </div>
                ${run.finished ? this.renderFinished(run) : this.renderPhase(run)}
                <confirm-dialog label="End workout?" confirmLabel="End workout" cancelLabel="Continue" variant="primary"
                                .open="${this.confirmEnd}" @confirm="${this.close}" @cancel="${this.keepGoing}">
                    Next time it starts from the beginning.
                </confirm-dialog>
            </div>
        `;
    }

    private renderPhase(run: GuidedRun) {
        const {kind, set, sets, seconds} = run.phase;
        const step = this.steps[run.phase.step];
        const left = run.secondsLeft;
        const rest = kind === "rest";
        // the sets are shown on their own line
        const amount = step.reps != null ? formatTarget({reps: step.reps}) : "";
        const waiting = seconds === undefined;
        return html`
            <div class="content">
                <div aria-live="polite">
                    ${rest ? html`<div class="muted">Rest · next</div>` : nothing}
                    <h2>${step.title}</h2>
                    ${sets > 1 ? html`<div class="muted">Set ${set} of ${sets}</div>` : nothing}
                </div>
                ${left !== undefined && seconds !== undefined ? html`
                    <sl-progress-ring value="${left / seconds * 100}" label="Time left">
                        <span class="big ring ${left >= 3600 ? "long" : ""}">${formatDuration(left)}</span>
                    </sl-progress-ring>` : amount ? html`<div class="big">${amount}</div>` : nothing}
                ${!rest && step.hints ? html`<p class="hints">${step.hints}</p>` : nothing}
                ${rest && amount ? html`<div class="muted">${amount}</div>` : nothing}
            </div>
            <div class="controls">
                <sl-button size="large" ?disabled="${run.index === 0}" @click="${() => run.previous()}">
                    <sl-icon name="skip-backward" label="Previous"></sl-icon>
                </sl-button>
                ${run.running
                        ? html`<sl-button size="large" variant="${waiting ? "default" : "warning"}" @click="${this.pause}">⏸ Pause</sl-button>`
                        : html`<sl-button size="large" variant="primary" @click="${() => run.start()}">▶ Resume</sl-button>`}
                <sl-button class="next" size="large" variant="${waiting && run.running ? "primary" : "default"}" @click="${() => run.next()}">
                    ${rest ? "Skip rest" : run.index === run.phases.length - 1 ? "Finish" : "Next"}
                </sl-button>
            </div>
        `;
    }

    private renderFinished(run: GuidedRun) {
        return html`
            <div class="content">
                <div class="big finished" aria-live="polite">✓ Done!</div>
                <div class="muted">Workout time ${formatDuration(run.secondsElapsed)}</div>
            </div>
            <div class="controls end">
                ${this.offerDone ? html`
                    <sl-button size="large" variant="success" @click="${this.markDone}">✓ Mark as done</sl-button>` : nothing}
                <sl-button size="large" variant="${this.offerDone ? "default" : "success"}" @click="${this.close}">Close</sl-button>
            </div>
        `;
    }

    private phaseStarted = () => {
        if (!this.run) return;
        if (this.run.finished) {
            playTimerSound(getTimerSound());
            vibrate([200, 100, 200]);
            this.report();
        } else {
            playStepSound(this.run.phase.kind, getTimerSound());
            vibrate(150);
        }
    }

    private pause = () => {
        this.run?.pause();
        this.report();
    }

    /** Saves what is done so far, if there is something new. */
    private report() {
        const seconds = this.run?.secondsElapsed ?? 0;
        if (seconds === this.reported) return;
        this.reported = seconds;
        this.dispatchEvent(new CustomEvent<number>(GuidedWorkoutEvents.progress, {detail: seconds}));
    }

    private onVisibilityChange = () => {
        this.run?.tick();
        if (document.visibilityState === "hidden") this.report();
    }

    private onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !this.confirmEnd) this.requestClose();
    }

    private requestClose = () => {
        if (!this.run || this.run.finished) {
            this.close();
            return;
        }
        this.resumeAfterConfirm = this.run.running;
        this.pause();
        if (this.run.finished) return; // just now
        this.confirmEnd = true;
    }

    private keepGoing = () => {
        this.confirmEnd = false;
        if (this.resumeAfterConfirm) this.run?.start();
    }

    private markDone = () => {
        this.dispatchEvent(new CustomEvent(GuidedWorkoutEvents.markDone));
        this.close();
    }

    private close = () => {
        this.dispatchEvent(new CustomEvent(GuidedWorkoutEvents.closed));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "guided-workout": GuidedWorkout;
    }
}
