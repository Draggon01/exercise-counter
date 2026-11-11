import {describe, expect, it} from "vitest";
import {closedPeriods, participants, periodDate, summarize, visiblePeople, addableDays} from "./statistics";

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

    describe("visiblePeople", () => {
        const everyone = ["me", "anna", "bob", "old"];
        const range = [{date: "1", finishers: ["anna", "bob"]}, {date: "2", finishers: ["bob"]}];

        it("shows current participants who were active in the range, and always me", () => {
            expect(visiblePeople(everyone, ["me", "anna", "old"], false, range, [], "me")).toEqual(["me", "anna"]);
        });

        it("with showEveryone also former participants, but still only those active in the range", () => {
            expect(visiblePeople(everyone, ["me", "anna"], true, range, [], "me")).toEqual(["me", "anna", "bob"]);
        });

        it("counts the running period as activity", () => {
            expect(visiblePeople(everyone, ["old"], false, [], ["old"], "me")).toEqual(["me", "old"]);
        });

        it("skips the participant rule without participant information", () => {
            expect(visiblePeople(everyone, undefined, false, range, [], "me")).toEqual(["me", "anna", "bob"]);
        });
    });

    it("handles no periods", () => {
        expect(summarize("x", [], [])).toMatchObject({currentStreak: 0, bestStreak: 0, rate: 0, total: 0});
    });
});

describe("addableDays", () => {
    const rows = (n: number, finishedBy: (i: number) => string[]) =>
        Array.from({length: n}, (_, i) => ({date: `2026-11-${String(i + 1).padStart(2, "0")}`, finishers: finishedBy(i)}));

    it("only missed days among the last 7 periods", () => {
        const periods = rows(10, i => i === 8 ? ["me"] : []); // 1–10 Nov, done on the 9th
        expect([...addableDays(periods, "me")]).toEqual(
            ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-10"]);
    });

    it("others' finishes do not count", () => {
        expect(addableDays(rows(2, () => ["anna"]), "me").size).toBe(2);
    });

    it("nothing when everything is done", () => {
        expect(addableDays(rows(3, () => ["me"]), "me").size).toBe(0);
    });
});
