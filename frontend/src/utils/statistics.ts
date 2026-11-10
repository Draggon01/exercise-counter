/** Key of the still-running period in the backend's StatisticDto. */
export const CURRENT_PERIOD = "current";

export type PeriodRow = {
    /** Day the period was closed (reset day), YYYY-MM-DD. */
    date: string;
    finishers: string[];
};

export type UserSummary = {
    username: string;
    /** Finished closed periods. */
    done: number;
    /** Closed periods in the range. */
    total: number;
    /** done / total, 0 if there are no periods. */
    rate: number;
    currentStreak: number;
    bestStreak: number;
    /** Finished the still-running period. */
    doneNow: boolean;
};

/** Backend keys are "YYYY-MM-DD:YYYY-MM-DD" (reset day twice); legacy keys may differ. */
export function periodDate(key: string): string {
    return key.split(":")[0];
}

/** Closed periods, oldest first, without the running one. */
export function closedPeriods(finishedInformation: Record<string, string[]>): PeriodRow[] {
    return Object.entries(finishedInformation)
        .filter(([key]) => key !== CURRENT_PERIOD)
        .map(([key, finishers]) => ({date: periodDate(key), finishers}))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/** Everybody who finished at least one period (or the current one), plus the given user. */
export function participants(finishedInformation: Record<string, string[]>, me?: string): string[] {
    const users = new Set<string>(Object.values(finishedInformation).flat());
    if (me) users.add(me);
    return [...users].sort((a, b) => a === me ? -1 : b === me ? 1 : a.localeCompare(b));
}

/**
 * Streaks and completion of one user over the given closed periods (oldest first).
 * The current streak counts the finished periods back from the newest one, plus the running period
 * if it is already done – a streak is not lost while the running period can still be finished.
 */
export function summarize(username: string, periods: PeriodRow[], current: string[]): UserSummary {
    const done = periods.map(p => p.finishers.includes(username));
    const doneNow = current.includes(username);

    let trailing = 0;
    for (let i = done.length - 1; i >= 0 && done[i]; i--) trailing++;

    let best = 0;
    let run = 0;
    for (const d of done) {
        run = d ? run + 1 : 0;
        best = Math.max(best, run);
    }
    const currentStreak = trailing + (doneNow ? 1 : 0);
    const doneCount = done.filter(Boolean).length;
    return {
        username,
        done: doneCount,
        total: periods.length,
        rate: periods.length ? doneCount / periods.length : 0,
        currentStreak,
        bestStreak: Math.max(best, currentStreak),
        doneNow,
    };
}
