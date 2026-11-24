import {Countdown} from "./countdown";

/** Pages that show the timer of an exercise: a running timer survives navigating between them. */
const TIMER_PAGES = /^\/(exercises\/(?!new$)[^/]+)?$/;

/**
 * The one running exercise timer, independent of the element that shows it: it keeps running from the home card to
 * the exercise page and back. Starting another one, or leaving those pages, pauses and saves it.
 */
class RunningTimer {
    /** Saves the progress (set by views/home/slice/progressSaver.ts). */
    save: (exerciseId: string, secondsDone: number) => void = () => undefined;

    private current?: { exerciseId: string, countdown: Countdown, unsubscribe: () => void };
    private readonly listeners = new Set<() => void>();

    /** The running countdown of this exercise, if it is the one that runs. */
    of(exerciseId: string): Countdown | undefined {
        return this.current?.exerciseId === exerciseId ? this.current.countdown : undefined;
    }

    /** Called when a timer starts or stops; returns the function that removes the listener. */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    start(exerciseId: string, countdown: Countdown) {
        if (this.current?.countdown === countdown) return;
        this.pause();
        countdown.report = secondsDone => this.save(exerciseId, secondsDone);
        countdown.start();
        if (!countdown.running) return;
        const unsubscribe = countdown.subscribe(() => {
            if (!countdown.running) this.release();
        });
        this.current = {exerciseId, countdown, unsubscribe};
        window.addEventListener("popstate", this.onLocationChange);
        document.addEventListener("visibilitychange", this.onVisibilityChange);
        this.changed();
    }

    /** Pauses and saves the running timer, if there is one. */
    pause() {
        this.current?.countdown.pause();
    }

    private release() {
        this.current?.unsubscribe();
        this.current = undefined;
        window.removeEventListener("popstate", this.onLocationChange);
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
        this.changed();
    }

    private onLocationChange = () => {
        if (!TIMER_PAGES.test(window.location.pathname)) this.pause();
    }

    /** The app may be closed without another chance: save what is done so far, it keeps running. */
    private onVisibilityChange = () => {
        if (document.visibilityState === "hidden" && this.current) {
            this.save(this.current.exerciseId, this.current.countdown.secondsDone);
        }
    }

    private changed() {
        this.listeners.forEach(listener => listener());
    }
}

export const runningTimer = new RunningTimer();
