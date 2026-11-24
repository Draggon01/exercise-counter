// @vitest-environment happy-dom
import {describe, expect, it} from "vitest";
import {ExerciseStepDto} from "../models/exerciseDetailsDto";
import {ExerciseSteps, nearestStep} from "./exercise-steps";

const step = (id: string): ExerciseStepDto =>
    ({stepId: id, title: id, hints: "", sets: null, reps: null, durationSeconds: null, restSeconds: null});

describe("exercise-steps", () => {
    it("finds the step at a scroll position", () => {
        expect(nearestStep([0, 300, 600], 0, 560)).toBe(0);
        expect(nearestStep([0, 300, 600], 290, 560)).toBe(1);
        expect(nearestStep([0, 300, 600], 560, 560)).toBe(2);
        expect(nearestStep([0], 0, 0)).toBe(0);
    });

    it("shows the pager only for several steps", async () => {
        const steps = document.createElement("exercise-steps") as ExerciseSteps;
        steps.steps = [step("a")];
        document.body.append(steps);
        await steps.updateComplete;
        expect(steps.shadowRoot!.querySelector(".pager")).toBeNull();

        steps.steps = [step("a"), step("b")];
        await steps.updateComplete;
        expect(steps.shadowRoot!.querySelectorAll(".dot")).toHaveLength(2);
        expect(steps.shadowRoot!.querySelector(".dots")!.getAttribute("aria-label")).toBe("Step 1 of 2");
    });
});
