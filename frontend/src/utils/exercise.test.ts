import {describe, expect, it} from "vitest";
import {exerciseTimeZone, isIncreaseExercise, isRepExercise, isTimeExercise, exerciseTarget, formatGoal, progressPercent, streakOf} from "./exercise";

describe("exercise type helpers", () => {
    it.each([
        ["NUMBERREPEAT", false, true, false],
        ["TIMEREPEAT", true, false, false],
        ["NUMBERINCREASE", false, true, true],
        ["TIMEINCREASE", true, false, true],
        [undefined, false, false, false],
    ])("%s", (type, time, rep, increase) => {
        expect(isTimeExercise(type)).toBe(time);
        expect(isRepExercise(type)).toBe(rep);
        expect(isIncreaseExercise(type)).toBe(increase);
    });
});

describe("exerciseTimeZone", () => {
    it("new exercise: the browser's zone", () => {
        expect(exerciseTimeZone(undefined, "Europe/Berlin")).toBe("Europe/Berlin");
    });

    it("existing exercise keeps its zone", () => {
        expect(exerciseTimeZone({timeZone: "Europe/Vienna"}, "America/New_York")).toBe("Europe/Vienna");
    });

    it("old exercise without zone gets the browser's when saved", () => {
        expect(exerciseTimeZone({timeZone: null}, "Europe/Vienna")).toBe("Europe/Vienna");
    });
});

describe("goal and progress", () => {
    it("formats the goal by type", () => {
        expect(formatGoal({exerciseType: "TIMEREPEAT", exerciseValue: "1200"})).toBe("20:00");
        expect(formatGoal({exerciseType: "NUMBERINCREASE", exerciseValue: "40"})).toBe("40 reps");
        expect(formatGoal({exerciseType: "NUMBERREPEAT", exerciseValue: ""})).toBe("No goal set");
    });

    it("target and percent stay in range", () => {
        expect(exerciseTarget({exerciseValue: "abc"})).toBe(0);
        expect(progressPercent(10, 40)).toBe(25);
        expect(progressPercent(50, 40)).toBe(100);
        expect(progressPercent(5, 0)).toBe(0);
    });

    it("finds the user's own streak", () => {
        expect(streakOf([{user: "a", streak: 3}, {user: "b", streak: 5}], "b")).toBe(5);
        expect(streakOf([], "b")).toBeUndefined();
    });
});
