import {describe, expect, it} from "vitest";
import {closedPeriods, participants, periodDate, summarize, visiblePeople} from "./statistics";

const info = {
    "2026-11-07:2026-11-07": ["anna", "me"],
    "2026-11-05:2026-11-05": ["me"],
    "2026-11-06:2026-11-06": ["anna"],
    "2026-11-08:2026-11-08": ["me", "anna"],
    "current": ["anna"],
};

describe("statistics helpers", () => {
    it("reads the reset day from the key", () => {
        expect(periodDate("2026-11-07:2026-11-07")).toBe("2026-11-07");
    });

    it("sorts closed periods oldest first and drops the running one", () => {
        expect(closedPeriods(info).map(p => p.date)).toEqual(["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
    });

    it("lists participants with the current user first", () => {
        expect(participants(info, "me")).toEqual(["me", "anna"]);
        expect(participants({"current": []}, "new")).toEqual(["new"]);
    });

    it("current streak counts back from the newest period, plus today if done", () => {
        const periods = closedPeriods(info);
        // me: done, missed, done, done -> trailing 2, not done today
        expect(summarize("me", periods, info.current)).toMatchObject({currentStreak: 2, bestStreak: 2, done: 3, total: 4});
        // anna: missed, done, done, done + done today -> 4
        expect(summarize("anna", periods, info.current)).toMatchObject({currentStreak: 4, bestStreak: 4, doneNow: true});
    });

    it("best streak can lie in the past", () => {
        const periods = [
            {date: "1", finishers: ["x"]}, {date: "2", finishers: ["x"]}, {date: "3", finishers: ["x"]},
            {date: "4", finishers: []}, {date: "5", finishers: ["x"]},
        ];
        expect(summarize("x", periods, [])).toMatchObject({currentStreak: 1, bestStreak: 3, rate: 0.8});
    });

    it("shows only current participants unless everyone is requested", () => {
        const everyone = ["me", "anna", "bob"];

        expect(visiblePeople(everyone, ["bob", "me"], false)).toEqual(["me", "bob"]);
        expect(visiblePeople(everyone, ["bob", "me"], true)).toEqual(everyone);
        expect(visiblePeople(everyone, undefined, false)).toEqual(everyone);
    });

    it("handles no periods", () => {
        expect(summarize("x", [], [])).toMatchObject({currentStreak: 0, bestStreak: 0, rate: 0, total: 0});
    });
});
