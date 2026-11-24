import {formatDuration} from "./format";

/** Exercise types as sent by the backend (ExerciseType enum). */
export type ExerciseType = "NUMBERREPEAT" | "TIMEREPEAT" | "NUMBERINCREASE" | "TIMEINCREASE";

/** Value is a duration in seconds. */
export const isTimeExercise = (type?: string) => type === "TIMEREPEAT" || type === "TIMEINCREASE";

/** Value is a number of repetitions. */
export const isRepExercise = (type?: string) => type === "NUMBERREPEAT" || type === "NUMBERINCREASE";

/** The value grows by exerciseIncrease after every period. */
export const isIncreaseExercise = (type?: string) => type === "NUMBERINCREASE" || type === "TIMEINCREASE";

/** The browser's time zone, e.g. "Europe/Vienna". */
export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Time zone the reset time of an exercise is meant in: an existing exercise keeps its zone (editing it on
 * a trip abroad does not move the reset), a new one gets the browser's.
 */
export function exerciseTimeZone(exercise: { timeZone?: string | null } | undefined, browser = browserTimeZone()): string {
    return exercise?.timeZone || browser;
}

/** Target of the current period: seconds for time exercises, reps otherwise. */
export const exerciseTarget = (exercise: { exerciseValue?: string }): number =>
    parseInt(exercise.exerciseValue ?? "0", 10) || 0;

/** The goal as text: "20:00", "40 reps", "No goal set". */
export function formatGoal(exercise: { exerciseValue?: string, exerciseType?: string }): string {
    if (!exercise.exerciseValue) return "No goal set";
    if (isTimeExercise(exercise.exerciseType)) {
        const seconds = parseInt(exercise.exerciseValue, 10);
        return isNaN(seconds) ? exercise.exerciseValue : formatDuration(seconds);
    }
    return isRepExercise(exercise.exerciseType) ? `${exercise.exerciseValue} reps` : exercise.exerciseValue;
}

/** 0–100, whole percent. */
export const progressPercent = (value: number, target: number): number =>
    target > 0 ? Math.max(0, Math.min(100, Math.round(value / target * 100))) : 0;

/** The user's streak among those who finished the exercise in this period. */
export const streakOf = (checks: { user: string, streak: number }[], username?: string): number | undefined =>
    checks.find(check => check.user === username)?.streak;
