// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ExerciseStepDto} from "../models/exerciseDetailsDto";
import {GuidedWorkout} from "./guided-workout";
import {WorkoutDialog} from "./workout-dialog";
import "./guided-workout";
import "./workout-dialog";

const step = (stepId: string, values: Partial<ExerciseStepDto> = {}): ExerciseStepDto =>
    ({stepId, title: stepId, hints: "", sets: null, reps: null, durationSeconds: null, restSeconds: null, ...values});

describe("guided-workout", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        document.body.replaceChildren();
        vi.useRealTimers();
    });

    async function show(...steps: ExerciseStepDto[]) {
        const workout = document.createElement("guided-workout") as GuidedWorkout;
        workout.steps = steps;
        workout.offerDone = true;
        const progress = vi.fn();
        workout.addEventListener("workout-progress", e => progress((e as CustomEvent<number>).detail));
        document.body.append(workout);
        await workout.updateComplete;
        return {workout, progress, text: () => workout.shadowRoot!.textContent!.replace(/\s+/g, " ")};
    }

    it("reports the workout time at the end and offers Mark as done", async () => {
        const {workout, progress, text} = await show(step("Wall sit", {durationSeconds: 10}));
        expect(text()).toContain("Step 1 of 1");
        vi.advanceTimersByTime(10_000);
        await workout.updateComplete;
        expect(progress.mock.calls).toEqual([[10]]);
        expect(text()).toContain("Mark as done");
        workout.remove();
        expect(progress).toHaveBeenCalledTimes(1);
    });

    it("saves once when it is left midway and stops", async () => {
        const {workout, progress} = await show(step("a", {reps: 12}));
        vi.advanceTimersByTime(7_000);
        workout.remove();
        vi.advanceTimersByTime(7_000);
        expect(progress.mock.calls).toEqual([[7]]);
    });

    it("pauses while asking whether to end, continues on Continue", async () => {
        const {workout, text} = await show(step("a", {durationSeconds: 30}));
        document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));
        await workout.updateComplete;
        expect(text()).toContain("Resume");
        workout.shadowRoot!.querySelector("confirm-dialog")!.dispatchEvent(new CustomEvent("cancel"));
        await workout.updateComplete;
        expect(text()).toContain("Pause");
    });
});

describe("workout-dialog", () => {
    afterEach(() => {
        document.body.replaceChildren();
        localStorage.clear();
    });

    async function open(mode: "ORDERED" | "SHUFFLED" = "ORDERED") {
        const dialog = document.createElement("workout-dialog") as WorkoutDialog;
        Object.assign(dialog, {exerciseId: "x", steps: [step("a"), step("b"), step("c")], mode, open: true});
        const started = vi.fn();
        dialog.addEventListener("start-workout", e => started((e as CustomEvent<ExerciseStepDto[]>).detail.map(s => s.stepId)));
        document.body.append(dialog);
        await dialog.updateComplete;
        return {
            dialog, started,
            start: () => (dialog.shadowRoot!.querySelector("sl-button[variant=primary]") as HTMLElement).click(),
        };
    }

    it("remembers own order and skipped steps on this device", async () => {
        const first = await open();
        first.dialog.shadowRoot!.querySelectorAll("exercise-sort-controls")[2].dispatchEvent(new CustomEvent("move-up"));
        const box = first.dialog.shadowRoot!.querySelector("sl-checkbox") as HTMLElement & {checked: boolean};
        box.checked = false;
        box.dispatchEvent(new CustomEvent("sl-change"));
        await first.dialog.updateComplete;
        first.start();
        expect(first.started).toHaveBeenCalledWith(["c", "b"]);

        const second = await open();
        second.start();
        expect(second.started).toHaveBeenCalledWith(["c", "b"]);
    });

    it("does not keep a shuffled order", async () => {
        const {start} = await open("SHUFFLED");
        start();
        expect(JSON.parse(localStorage.getItem("exercise-counter.workout.x")!)).toEqual({skipped: []});
    });
});
