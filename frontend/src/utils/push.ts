/** Helpers for reminders by push notification (pure – the browser calls stay in the push slice). */

/**
 * What this browser can do:
 * - `supported`: reminders can be turned on
 * - `install-first`: iPhone / iPad – push works only in the app added to the home screen
 * - `unsupported`: no push in this browser
 */
export type PushSupport = "supported" | "install-first" | "unsupported";

export interface PushEnvironment {
    hasServiceWorker: boolean;
    hasPushManager: boolean;
    hasNotification: boolean;
    /** iPhone / iPad (also iPadOS that pretends to be a Mac) */
    isIos: boolean;
    /** started from the home screen (installed app) */
    standalone: boolean;
}

export function pushSupport(env: PushEnvironment): PushSupport {
    if (env.hasServiceWorker && env.hasPushManager && env.hasNotification) {
        return "supported";
    }
    return env.isIos && !env.standalone ? "install-first" : "unsupported";
}

/** The current browser as {@link PushEnvironment}. */
export function currentPushEnvironment(): PushEnvironment {
    const ua = navigator.userAgent;
    return {
        hasServiceWorker: "serviceWorker" in navigator,
        hasPushManager: "PushManager" in window,
        hasNotification: "Notification" in window,
        isIos: /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1),
        standalone: window.matchMedia?.("(display-mode: standalone)").matches
            || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    };
}

/** The server's VAPID public key (base64url) as `applicationServerKey` for `pushManager.subscribe`. */
export function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
    const binary = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/** Choices for "remind me ... before the reset" (the backend accepts exactly these). */
export const REMINDER_HOURS = [1, 2, 3, 6, 12] as const;

export function reminderHoursLabel(hours: number): string {
    return hours === 1 ? "1 hour" : `${hours} hours`;
}
