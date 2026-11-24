// @vitest-environment happy-dom
import {afterEach, describe, expect, it, vi} from "vitest";
import {getTimerSound, getWorkoutSetup, isVibrationOn, setTimerSound, setVibrationOn, vibrate} from "./preferences";

describe("device preferences", () => {
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it("timer sound defaults to beeps and remembers the choice", () => {
        expect(getTimerSound()).toBe("beeps");
        setTimerSound("chime");
        expect(getTimerSound()).toBe("chime");
    });

    it("ignores unknown stored sounds", () => {
        localStorage.setItem("exercise-counter.timer-sound", "trumpet");
        expect(getTimerSound()).toBe("beeps");
    });

    it("vibration is on by default and can be turned off", () => {
        expect(isVibrationOn()).toBe(true);
        setVibrationOn(false);
        expect(isVibrationOn()).toBe(false);
    });

    it("workout setup survives broken or missing entries", () => {
        expect(getWorkoutSetup("x")).toEqual({order: undefined, skipped: []});
        for (const broken of ["{", "null", '{"order":5,"skipped":"a"}']) {
            localStorage.setItem("exercise-counter.workout.x", broken);
            expect(getWorkoutSetup("x")).toEqual({order: undefined, skipped: []});
        }
    });

    it("vibrate only calls the device when vibration is on", () => {
        const device = vi.fn();
        Object.defineProperty(navigator, "vibrate", {value: device, configurable: true});
        vibrate(30);
        setVibrationOn(false);
        vibrate(30);
        expect(device).toHaveBeenCalledTimes(1);
    });
});
