import {getTimerSound, vibrate} from "./preferences";
import {playTimerSound} from "./sounds";

/**
 * A countdown without UI. Measures against the clock (not by counting ticks), so it stays right when the browser
 * slows timers down in the background. While it runs the screen is kept on (if supported); at the end it plays the
 * sound chosen in Options.
 */
export class Countdown {
    target = 0;
    secondsLeft = 0;
    running = false;

    /** Called with the seconds done when it is paused, reset or finished, so they can be saved. */
    report: (secondsDone: number) => void = () => undefined;

    private endsAt = 0;
    private interval?: ReturnType<typeof setInterval>;
    private wakeLock?: WakeLockSentinel;
    private readonly listeners = new Set<() => void>();

    get finished() {
        return this.target > 0 && this.secondsLeft === 0;
    }

    get secondsDone() {
        return this.target - this.secondsLeft;
    }

    /** Called after every change; returns the function that removes the listener. */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /** Starts over with these values (stopped, nothing is reported). */
    set(target: number, secondsDone: number) {
        this.stop();
        this.target = target;
        this.secondsLeft = Math.max(0, target - secondsDone);
        this.changed();
    }

    start() {
        if (this.running || this.finished || this.target <= 0) return;
        this.running = true;
        this.endsAt = Date.now() + this.secondsLeft * 1000;
        this.interval = setInterval(this.tick, 1000);
        document.addEventListener("visibilitychange", this.onVisibilityChange);
        void this.keepScreenOn();
        this.changed();
    }

    pause() {
        if (this.running) this.measure();
        this.stop();
        this.report(this.secondsDone);
        this.changed();
    }

    reset() {
        this.stop();
        this.secondsLeft = this.target;
        this.report(0);
        this.changed();
    }

    private tick = () => {
        this.measure();
        if (this.secondsLeft === 0) {
            this.stop();
            playTimerSound(getTimerSound());
            vibrate([200, 100, 200]);
            this.report(this.target);
        }
        this.changed();
    }

    private measure() {
        const left = Math.max(0, Math.round((this.endsAt - Date.now()) / 1000));
        this.secondsLeft = Math.min(this.secondsLeft, left); // never backwards if the clock is changed
    }

    private stop() {
        this.running = false;
        clearInterval(this.interval);
        this.interval = undefined;
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
        void this.wakeLock?.release().catch(() => undefined);
        this.wakeLock = undefined;
    }

    /** The browser releases the wake lock when the app is hidden. */
    private onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            void this.keepScreenOn();
            this.tick();
        }
    }

    private async keepScreenOn() {
        try {
            const lock = await navigator.wakeLock?.request("screen");
            if (this.running) {
                this.wakeLock = lock;
            } else {
                void lock?.release().catch(() => undefined); // paused in the meantime
            }
        } catch {
            // denied (e.g. battery saver) – the timer works anyway
        }
    }

    private changed() {
        this.listeners.forEach(listener => listener());
    }
}
