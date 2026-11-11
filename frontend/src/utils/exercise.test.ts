import {describe, expect, it} from "vitest";
import {exerciseTimeZone, isIncreaseExercise, isRepExercise, isTimeExercise} from "./exercise";

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
