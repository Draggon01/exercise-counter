/** Keeps the screen on between `on()` and `off()` (if the browser can); the browser drops it while the app is hidden. */
export class ScreenLock {
    private wanted = false;
    private lock?: WakeLockSentinel;

    on() {
        if (this.wanted) return;
        this.wanted = true;
        document.addEventListener("visibilitychange", this.onVisibilityChange);
        void this.request();
    }

    off() {
        this.wanted = false;
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
        void this.lock?.release().catch(() => undefined);
        this.lock = undefined;
    }

    private onVisibilityChange = () => {
        if (document.visibilityState === "visible") void this.request();
    }

    private async request() {
        try {
            const lock = await navigator.wakeLock?.request("screen");
            if (this.wanted) {
                this.lock = lock;
            } else {
                void lock?.release().catch(() => undefined); // turned off in the meantime
            }
        } catch {
            // denied (e.g. battery saver) – everything else works anyway
        }
    }
}
