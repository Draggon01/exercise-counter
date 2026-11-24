// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {store} from "../../../store";
import {ExerciseDto} from "../models/exerciseDto";
import {progressChanged} from "../slice/exerciseSlice";
import "./exercise-card-compact";
import {ExerciseCardCompact} from "./exercise-card-compact";

const item = {exerciseId: "a", exerciseTitle: "Push-ups", creator: "x", exerciseType: "NUMBERREPEAT", exerciseValue: "40"} as ExerciseDto;

async function mount(props: Partial<ExerciseCardCompact> = {}) {
    store.dispatch(progressChanged({exerciseId: "a", value: 10}));
    const card = document.createElement("exercise-card-compact") as ExerciseCardCompact;
    Object.assign(card, {item, ...props});
    card.stateChanged(store.getState());
    document.body.append(card);
    await card.updateComplete;
    const opened = vi.fn();
    const checked = vi.fn();
    card.addEventListener("open-exercise", opened);
    card.addEventListener("check-changed", e => checked((e as CustomEvent<boolean>).detail));
    const find = <T extends HTMLElement>(selector: string) => card.shadowRoot!.querySelector<T>(selector);
    return {card, opened, checked, find};
}

describe("exercise-card-compact", () => {
    beforeEach(() => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 204}))));
    afterEach(() => {
        document.body.replaceChildren();
        vi.unstubAllGlobals();
    });

    it("the title opens the exercise", async () => {
        const {find, opened} = await mount();
        find(".headline a")!.click();
        expect(opened).toHaveBeenCalledOnce();
    });

    it("the controls do not open the exercise", async () => {
        const {find, opened, checked} = await mount();
        find(".done-toggle")!.click();
        expect(checked).toHaveBeenCalledWith(true);

        const progress = find("exercise-progress") as HTMLElement & {updateComplete: Promise<unknown>};
        await progress.updateComplete;
        const counter = progress.shadowRoot!.querySelector("rep-counter")!;
        await counter.updateComplete;
        counter.shadowRoot!.querySelectorAll<HTMLElement>("sl-button").forEach(button => button.click());

        expect(opened).not.toHaveBeenCalled();
        // the controls are not inside the link either
        expect(find(".headline a")!.querySelector("sl-icon-button, exercise-progress")).toBeNull();
    });

    it("done: no controls except the circle", async () => {
        const {find} = await mount({checked: true});
        expect(find("exercise-progress")).toBeNull();
        expect(find("sl-progress-bar")).toBeNull();
        expect(find(".done-toggle")!.getAttribute("name")).toBe("check-circle-fill");
    });

    it("edit order: only the sort controls", async () => {
        const {find} = await mount({editMode: true});
        expect(find("exercise-sort-controls")).not.toBeNull();
        expect(find("a, .done-toggle, exercise-progress")).toBeNull();
    });
});
