// @vitest-environment happy-dom
import {describe, expect, it, vi} from "vitest";
import "./exercise-form-dialog";
import {ExerciseFormDialog, toExerciseType} from "./exercise-form-dialog";
import {ExerciseDto} from "../models/exerciseDto";

async function mount(exercise?: ExerciseDto) {
    const dialog = document.createElement("exercise-form-dialog") as ExerciseFormDialog;
    dialog.groups = ["team"];
    dialog.exercise = exercise;
    dialog.open = true;
    document.body.append(dialog);
    await dialog.updateComplete;
    return dialog;
}

const field = (dialog: ExerciseFormDialog, name: string) =>
    dialog.shadowRoot!.querySelector(`[name="${name}"]`) as (HTMLInputElement & { checked: boolean }) | null;

async function change(dialog: ExerciseFormDialog, name: string, value: string | boolean) {
    const el = field(dialog, name)!;
    if (typeof value === "boolean") el.checked = value; else el.value = value;
    el.dispatchEvent(new Event("sl-change"));
    await dialog.updateComplete;
}

function save(dialog: ExerciseFormDialog): ExerciseDto {
    const onSave = vi.fn();
    dialog.addEventListener("save", onSave);
    (dialog.shadowRoot!.querySelectorAll("sl-button")[1] as HTMLElement).click();
    return onSave.mock.calls[0][0].detail;
}

describe("toExerciseType", () => {
    it("maps measure and increase to the backend type", () => {
        expect(toExerciseType("reps", false)).toBe("NUMBERREPEAT");
        expect(toExerciseType("reps", true)).toBe("NUMBERINCREASE");
        expect(toExerciseType("time", false)).toBe("TIMEREPEAT");
        expect(toExerciseType("time", true)).toBe("TIMEINCREASE");
    });
});

describe("exercise-form-dialog", () => {
    it("starts a new exercise as private repetitions without increase", async () => {
        const dialog = await mount();

        expect(field(dialog, "measure")!.value).toBe("reps");
        expect(field(dialog, "visibility")!.value).toBe("PRIVATE");
        expect(field(dialog, "exerciseIncrease")).toBeNull();
        expect(field(dialog, "groups")).toBeNull();
        expect(field(dialog, "startTime")!.value).toBe("23:59");
    });

    it("shows the increase field only when increasing, and groups only for GROUPS", async () => {
        const dialog = await mount();

        await change(dialog, "increasing", true);
        expect(field(dialog, "exerciseIncrease")).not.toBeNull();

        await change(dialog, "visibility", "GROUPS");
        expect(field(dialog, "groups")).not.toBeNull();
    });

    it("labels the goal by measure and previews durations", async () => {
        const dialog = await mount();
        await change(dialog, "measure", "time");

        const goal = field(dialog, "exerciseValue")!;
        expect(goal.getAttribute("label")).toBe("Goal per period (seconds)");
        goal.value = "90";
        goal.dispatchEvent(new Event("sl-input"));
        await dialog.updateComplete;

        expect(dialog.shadowRoot!.querySelector(".hint")!.textContent).toContain("= 1:30");
    });

    it("prefills an increasing time exercise and emits the backend format", async () => {
        const dialog = await mount({
            exerciseId: "id-1", exerciseTitle: "Plank", creator: "me", daysRepeat: 2, startTime: "07:30:00",
            utcOffset: 1, exerciseType: "TIMEINCREASE", exerciseValue: "60", exerciseIncrease: "5",
            visibility: "GROUPS", groups: ["team"], position: 3,
        });
        expect(field(dialog, "measure")!.value).toBe("time");
        expect(field(dialog, "increasing")!.checked).toBe(true);
        expect(field(dialog, "startTime")!.value).toBe("07:30");

        field(dialog, "startTime")!.value = "08:15";
        const saved = save(dialog);

        expect(saved).toMatchObject({
            exerciseId: "id-1", exerciseTitle: "Plank", exerciseType: "TIMEINCREASE", exerciseValue: "60",
            exerciseIncrease: "5", startTime: "08:15:00", daysRepeat: 2, visibility: "GROUPS", groups: ["team"],
            position: 3,
        });
    });

    it("clears increase and groups when they no longer apply", async () => {
        const dialog = await mount({
            exerciseId: "id-1", exerciseTitle: "Plank", creator: "me", daysRepeat: 1, startTime: "07:30:00",
            utcOffset: 1, exerciseType: "TIMEINCREASE", exerciseValue: "60", exerciseIncrease: "5",
            visibility: "GROUPS", groups: ["team"],
        });
        await change(dialog, "increasing", false);
        await change(dialog, "visibility", "PUBLIC");

        const saved = save(dialog);

        expect(saved).toMatchObject({exerciseType: "TIMEREPEAT", exerciseIncrease: "", visibility: "PUBLIC", groups: []});
    });

    it("starts with empty fields every time it is opened for a new exercise", async () => {
        const dialog = await mount();
        field(dialog, "exerciseTitle")!.value = "typed before";

        dialog.open = false;
        await dialog.updateComplete;
        dialog.open = true;
        await dialog.updateComplete;

        expect(field(dialog, "exerciseTitle")!.value).toBe("");
    });

    it("emits close on cancel", async () => {
        const dialog = await mount();
        const onClose = vi.fn();
        dialog.addEventListener("close", onClose);

        (dialog.shadowRoot!.querySelectorAll("sl-button")[0] as HTMLElement).click();

        expect(onClose).toHaveBeenCalledOnce();
    });
});
