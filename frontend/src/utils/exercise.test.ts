import {describe, expect, it} from "vitest";
import {isIncreaseExercise, isRepExercise, isTimeExercise} from "./exercise";

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
