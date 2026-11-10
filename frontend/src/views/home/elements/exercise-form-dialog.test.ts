// @vitest-environment happy-dom
import {describe, expect, it, vi} from "vitest";
import "./exercise-form-dialog";
import {ExerciseFormDialog} from "./exercise-form-dialog";
import {ExerciseDto} from "../models/exerciseDto";

const TYPES = {NUMBERREPEAT: "Constant repetitions", TIMEINCREASE: "Increasing duration"};

async function mount(exercise?: ExerciseDto) {
    const dialog = document.createElement("exercise-form-dialog") as ExerciseFormDialog;
    dialog.exerciseTypes = TYPES;
    dialog.visibilities = ["PUBLIC", "PRIVATE", "GROUPS"];
    dialog.groups = ["team"];
    dialog.exercise = exercise;
    dialog.open = true;
    document.body.append(dialog);
    await dialog.updateComplete;
    return dialog;
}

const field = (dialog: ExerciseFormDialog, name: string) =>
    dialog.shadowRoot!.querySelector(`[name="${name}"]`) as HTMLInputElement | null;

async function chooseType(dialog: ExerciseFormDialog, type: string) {
    const select = field(dialog, "exerciseType")!;
    select.value = type;
    select.dispatchEvent(new Event("sl-change"));
    await dialog.updateComplete;
}

describe("exercise-form-dialog", () => {
    it("shows no value fields before a type is chosen", async () => {
        const dialog = await mount();

        expect(field(dialog, "exerciseValue")).toBeNull();
        expect(dialog.shadowRoot!.textContent).not.toContain("not implemented");
    });

    it("shows the increase field only for increase types", async () => {
        const dialog = await mount();

        await chooseType(dialog, "NUMBERREPEAT");
        expect(field(dialog, "exerciseValue")!.getAttribute("label")).toBe("Repetitions :");
        expect(field(dialog, "exerciseIncrease")).toBeNull();

        await chooseType(dialog, "TIMEINCREASE");
        expect(field(dialog, "exerciseValue")!.getAttribute("label")).toBe("Duration :");
        expect(field(dialog, "exerciseIncrease")).not.toBeNull();
    });

    it("prefills an exercise and emits the edited values on save", async () => {
        const dialog = await mount({
            exerciseId: "id-1", exerciseTitle: "Pushups", creator: "me", daysRepeat: 2, startTime: "07:30:00",
            utcOffset: 1, exerciseType: "NUMBERREPEAT", exerciseValue: "20", exerciseIncrease: "",
            visibility: "GROUPS", groups: ["team"], position: 3,
        });
        expect(field(dialog, "exerciseTitle")!.value).toBe("Pushups");
        expect(field(dialog, "groups")).not.toBeNull();

        field(dialog, "exerciseTitle")!.value = "Push-ups";
        field(dialog, "exerciseValue")!.value = "25";
        const onSave = vi.fn();
        dialog.addEventListener("save", onSave);
        (dialog.shadowRoot!.querySelectorAll("sl-button")[1] as HTMLElement).click();

        const saved: ExerciseDto = onSave.mock.calls[0][0].detail;
        expect(saved).toMatchObject({
            exerciseId: "id-1", exerciseTitle: "Push-ups", exerciseValue: "25", exerciseType: "NUMBERREPEAT",
            startTime: "07:30:00", daysRepeat: 2, visibility: "GROUPS", groups: ["team"], position: 3,
        });
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

    it("emits close on the close button", async () => {
        const dialog = await mount();
        const onClose = vi.fn();
        dialog.addEventListener("close", onClose);

        (dialog.shadowRoot!.querySelectorAll("sl-button")[0] as HTMLElement).click();

        expect(onClose).toHaveBeenCalledOnce();
    });
});
