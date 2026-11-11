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
