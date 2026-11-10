/**
 * Light / dark mode. "system" follows the OS setting. The choice is a per-device display
 * preference, so it lives in localStorage (not in the backend options).
 * Dark mode = Shoelace's "sl-theme-dark" class on <html>; the --app-* tokens follow it.
 */
export type ColorScheme = "system" | "light" | "dark";

const STORAGE_KEY = "exercise-counter.color-scheme";
const DARK_CLASS = "sl-theme-dark";
const darkQuery = () => window.matchMedia?.("(prefers-color-scheme: dark)");

export function getColorScheme(): ColorScheme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === "light" || stored === "dark" ? stored : "system";
    } catch {
        return "system";
    }
}

export function setColorScheme(scheme: ColorScheme) {
    try {
        if (scheme === "system") {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, scheme);
        }
    } catch {
        // storage blocked (private mode): the choice only lasts for this page
    }
    applyColorScheme(scheme);
}

/** @return true if dark mode is active afterwards */
export function applyColorScheme(scheme: ColorScheme = getColorScheme()): boolean {
    const dark = scheme === "dark" || (scheme === "system" && !!darkQuery()?.matches);
    document.documentElement.classList.toggle(DARK_CLASS, dark);
    return dark;
}

/** Applies the stored scheme and keeps following the OS while "system" is chosen. */
export function initColorScheme() {
    applyColorScheme();
    darkQuery()?.addEventListener?.("change", () => {
        if (getColorScheme() === "system") {
            applyColorScheme("system");
        }
    });
}
