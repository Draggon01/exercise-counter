const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Seconds as a clock: `M:SS`, or `H:MM:SS` from one hour on. Used for time exercises.
 */
export function formatDuration(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const ss = s.toString().padStart(2, "0");
    return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * Time until the next reset, rounded up to the shown unit:
 * "2 Days and 3 Hours left", "1 Day left", "5 Hours left", "30 Minutes left"; "—" if unknown.
 */
export function formatTimeLeft(seconds?: number | null): string {
    if (seconds == null) {
        return "—";
    }
    const secs = Math.max(0, seconds);
    if (secs >= 86400) {
        let days = Math.floor(secs / 86400);
        let hours = Math.ceil((secs % 86400) / 3600);
        if (hours === 24) {
            days++;
            hours = 0;
        }
        return hours === 0
            ? `${plural(days, "Day")} left`
            : `${plural(days, "Day")} and ${plural(hours, "Hour")} left`;
    }
    if (secs >= 3600) {
        return `${plural(Math.ceil(secs / 3600), "Hour")} left`;
    }
    return `${plural(Math.ceil(secs / 60), "Minute")} left`;
}

/** Less than 6 hours until the reset. */
export const isUrgent = (seconds?: number | null) => seconds != null && seconds < 6 * 3600;
