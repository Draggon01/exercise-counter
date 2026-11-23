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

/** Tabs of the reminder setup guide. */
export type SetupPlatform = "ios" | "mac-safari" | "android" | "desktop-chrome";

/** The guide tab that fits the browser (user agent + touch points, iPadOS pretends to be a Mac). */
export function setupPlatform(userAgent: string, maxTouchPoints = 0): SetupPlatform {
    if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) {
        return "ios";
    }
    if (/Android/.test(userAgent)) {
        return "android";
    }
    // Chrome, Edge and other Chromium browsers name "Chrome" in their user agent, Safari does not
    if (/Macintosh/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome|Chromium|Firefox/.test(userAgent)) {
        return "mac-safari";
    }
    return "desktop-chrome";
}

/** "07:00" – quiet hours are full hours. */
export const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** How long a browser step of turning on reminders may take before it counts as stuck. */
export const PUSH_STEP_TIMEOUT_MS = 20_000;

/**
 * Runs one browser step of turning on reminders: a failure or a step that never finishes becomes an error
 * that names the step and the browser's reason (e.g. "Subscribing at the push service failed: AbortError – ...").
 */
export async function pushStep<T>(step: string, run: Promise<T>, timeoutMs = PUSH_STEP_TIMEOUT_MS): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${step} did not finish – please try again`)), timeoutMs);
    });
    try {
        return await Promise.race([run, timeout]);
    } catch (e) {
        if (e instanceof Error && e.message.startsWith(step)) throw e;
        throw new Error(`${step} failed: ${browserErrorText(e)}`);
    } finally {
        clearTimeout(timer);
    }
}

/** "AbortError – Registration failed - push service error" for DOMExceptions, else the message. */
export function browserErrorText(e: unknown): string {
    if (e instanceof Error) {
        return e.name && e.name !== "Error" ? `${e.name} – ${e.message}` : e.message;
    }
    return String(e);
}
