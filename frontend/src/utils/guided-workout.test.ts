// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {applyOrder, GuidedRun, shuffle, workoutPhases, WorkoutStep} from "./guided-workout";

const step = (stepId: string, values: Partial<WorkoutStep> = {}): WorkoutStep =>
    ({stepId, sets: null, durationSeconds: null, restSeconds: null, ...values});
const ids = (steps: { stepId: string }[]) => steps.map(s => s.stepId).join("");

describe("workoutPhases", () => {
    it("repeats sets with rests in between, none at the end", () => {
        const phases = workoutPhases([step("a", {sets: 2, durationSeconds: 30, restSeconds: 10}), step("b", {sets: 2, restSeconds: 5})]);

        expect(phases.map(p => `${p.kind} ${p.step}/${p.set} ${p.seconds}`)).toEqual([
            "work 0/1 30", "rest 0/2 10", "work 0/2 30", "rest 1/1 10", "work 1/1 undefined", "rest 1/2 5", "work 1/2 undefined",
        ]);
    });

    it("has no rest for 0 or no rest seconds", () => {
        expect(workoutPhases([step("a", {sets: 2, restSeconds: 0}), step("b")]).map(p => p.kind)).toEqual(["work", "work", "work"]);
        expect(workoutPhases([])).toEqual([]);
    });
});

describe("order", () => {
    const steps = ["a", "b", "c"].map(id => step(id));

    it("keeps the creator's order without an own one", () => expect(ids(applyOrder(steps, undefined))).toBe("abc"));
    it("uses the own order", () => expect(ids(applyOrder(steps, ["c", "a", "b"]))).toBe("cab"));
    it("drops deleted and doubled steps", () => expect(ids(applyOrder(steps, ["c", "x", "c", "b", "a"]))).toBe("cba"));
    it("puts new steps behind their predecessor", () => {
        expect(ids(applyOrder(steps, ["c", "a"]))).toBe("cab");
        expect(ids(applyOrder(steps, ["c", "b"]))).toBe("acb");
    });
    it("shuffles a copy with all items", () => {
        expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
        const list = [1, 2, 3];
        expect(shuffle(list).sort()).toEqual([1, 2, 3]);
        expect(list).toEqual([1, 2, 3]);
    });
});

describe("GuidedRun", () => {
    let run: GuidedRun;
    const onPhase = vi.fn();
    const create = (...steps: WorkoutStep[]) => {
        run = new GuidedRun(workoutPhases(steps));
        run.onPhase = onPhase;
        run.start();
    };

    beforeEach(() => {
        vi.useFakeTimers();
        onPhase.mockClear();
    });
    afterEach(() => {
        run.pause();
        vi.useRealTimers();
    });

    it("counts down, rests and finishes by itself", () => {
        create(step("a", {sets: 2, durationSeconds: 10, restSeconds: 5}));
        vi.advanceTimersByTime(4_000);
        expect(run.secondsLeft).toBe(6);
        vi.advanceTimersByTime(7_000);
        expect(run.phase.kind).toBe("rest");
        expect(run.secondsLeft).toBe(4);
        vi.advanceTimersByTime(14_000);
        expect(run.finished).toBe(true);
        expect(run.running).toBe(false);
        expect(run.secondsElapsed).toBe(25);
        expect(onPhase).toHaveBeenCalledTimes(3);
    });

    it("waits for Next on steps without a duration", () => {
        create(step("a"), step("b"));
        vi.advanceTimersByTime(60_000);
        expect(run.index).toBe(0);
        expect(run.secondsLeft).toBeUndefined();
        run.next();
        expect(run.index).toBe(1);
        run.next();
        expect(run.finished).toBe(true);
        expect(run.secondsElapsed).toBe(60);
    });

    it("does not count paused time", () => {
        create(step("a", {durationSeconds: 30}));
        vi.advanceTimersByTime(5_000);
        run.pause();
        vi.advanceTimersByTime(60_000);
        expect(run.secondsLeft).toBe(25);
        run.start();
        vi.advanceTimersByTime(5_000);
        expect(run.secondsLeft).toBe(20);
        expect(run.secondsElapsed).toBe(10);
    });

    it("catches up after the background, with one signal, without counting time after the end", () => {
        create(step("a", {sets: 3, durationSeconds: 10}));
        vi.setSystemTime(Date.now() + 600_000);
        vi.advanceTimersByTime(250);
        expect(run.finished).toBe(true);
        expect(run.secondsElapsed).toBe(30);
        expect(onPhase).toHaveBeenCalledTimes(1);
    });

    it("goes back to the previous set and starts it over", () => {
        create(step("a", {durationSeconds: 10, restSeconds: 5}), step("b", {durationSeconds: 10}));
        vi.advanceTimersByTime(17_000);
        expect(run.index).toBe(2);
        run.previous();
        expect(run.index).toBe(0);
        expect(run.secondsLeft).toBe(10);
        run.previous();
        expect(run.index).toBe(0);
    });

    it("Next works while paused and stays paused", () => {
        create(step("a"), step("b", {durationSeconds: 10}));
        run.pause();
        run.next();
        vi.advanceTimersByTime(5_000);
        expect(run.secondsLeft).toBe(10);
        expect(run.running).toBe(false);
    });
});
