/** Exercise types as sent by the backend (ExerciseType enum). */
export type ExerciseType = "NUMBERREPEAT" | "TIMEREPEAT" | "NUMBERINCREASE" | "TIMEINCREASE";

/** Value is a duration in seconds. */
export const isTimeExercise = (type?: string) => type === "TIMEREPEAT" || type === "TIMEINCREASE";

/** Value is a number of repetitions. */
export const isRepExercise = (type?: string) => type === "NUMBERREPEAT" || type === "NUMBERINCREASE";

/** The value grows by exerciseIncrease after every period. */
export const isIncreaseExercise = (type?: string) => type === "NUMBERINCREASE" || type === "TIMEINCREASE";
