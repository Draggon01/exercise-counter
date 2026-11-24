import {describe, expect, it} from "vitest";
import {formatDuration, formatTimeLeft, isUrgent, formatTarget} from "./format";

describe("formatDuration", () => {
    it.each([
        [0, "0:00"],
        [5, "0:05"],
        [65, "1:05"],
        [600, "10:00"],
        [3600, "1:00:00"],
        [3725, "1:02:05"],
        [-3, "0:00"],
    ])("%i s -> %s", (seconds, expected) => {
        expect(formatDuration(seconds)).toBe(expected);
    });
});

describe("formatTimeLeft", () => {
    it.each([
        [undefined, "—"],
        [null, "—"],
        [0, "0 Minutes left"],
        [59, "1 Minute left"],
        [1800, "30 Minutes left"],          // was "-30 Minutes left"
        [3600, "1 Hour left"],              // was "2 Hours left"
        [5400, "2 Hours left"],
        [86400, "1 Day left"],
        [90000, "1 Day and 1 Hour left"],
        [2 * 86400 + 3 * 3600, "2 Days and 3 Hours left"],
        [2 * 86400 - 1, "2 Days left"],     // 1 day 23:59:59 rounds up
    ])("%s s -> %s", (seconds, expected) => {
        expect(formatTimeLeft(seconds)).toBe(expected);
    });
});

describe("isUrgent", () => {
    it("is true below 6 hours", () => {
        expect(isUrgent(6 * 3600 - 1)).toBe(true);
        expect(isUrgent(6 * 3600)).toBe(false);
        expect(isUrgent(undefined)).toBe(false);
    });
});

describe("formatTarget", () => {
    it.each([
        [{sets: 3, reps: 12}, "3 × 12"],
        [{reps: 1}, "1 rep"],
        [{sets: 3, durationSeconds: 30, restSeconds: 15}, "3 × 30 s · 15 s rest"],
        [{durationSeconds: 90}, "1:30 min"],
        [{sets: 2}, "2 sets"],
        [{restSeconds: 60}, "1:00 min rest"],
        [{sets: null, reps: null, durationSeconds: null, restSeconds: 0}, ""],
    ])("%o → %s", (step, text) => expect(formatTarget(step)).toBe(text));
});
