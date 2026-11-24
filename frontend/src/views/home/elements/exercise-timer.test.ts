// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import "./exercise-timer";
import {runningTimer} from "../../../utils/running-timer";
import {ExerciseTimer} from "./exercise-timer";

async function mount(targetSeconds: number, completedSeconds = 0) {
    const timer = document.createElement("exercise-timer") as ExerciseTimer;
    timer.targetSeconds = targetSeconds;
    timer.completedSeconds = completedSeconds;
    document.body.append(timer);
    await timer.updateComplete;
    const progress = vi.fn();
    timer.addEventListener("progress-changed", e => progress((e as CustomEvent<number>).detail));
    return {timer, progress};
}

const display = (timer: ExerciseTimer) => timer.shadowRoot!.querySelector(".timer-display")!.textContent!.trim();
const buttons = (timer: ExerciseTimer) =>
    [...timer.shadowRoot!.querySelectorAll("sl-button")].map(b => b.textContent!.trim());
const click = async (timer: ExerciseTimer, label: string) => {
    const button = [...timer.shadowRoot!.querySelectorAll("sl-button")].find(b => b.textContent!.includes(label));
    (button as HTMLElement).click();
    await timer.updateComplete;
};

describe("exercise-timer", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("starts at the full duration when nothing was saved (was 0:00 and finished at once)", async () => {
        const {timer} = await mount(90);

        expect(display(timer)).toBe("1:30");
        expect(buttons(timer)).toEqual(["▶ Start"]);
    });

    it("continues from the saved progress", async () => {
        const {timer} = await mount(90, 30);

        expect(display(timer)).toBe("1:00");
        expect(buttons(timer)).toEqual(["▶ Resume", "Reset"]);
    });

    it("counts down, reports progress on pause", async () => {
        const {timer, progress} = await mount(90);

        await click(timer, "Start");
        vi.advanceTimersByTime(10_000);
        await timer.updateComplete;
        expect(display(timer)).toBe("1:20");

        await click(timer, "Pause");
        expect(progress).toHaveBeenLastCalledWith(10);
    });

    it("finishes and reports the full duration", async () => {
        const {timer, progress} = await mount(3);

        await click(timer, "Start");
        vi.advanceTimersByTime(3_000);
        await timer.updateComplete;

        expect(display(timer)).toBe("✓ Done!");
        expect(progress).toHaveBeenLastCalledWith(3);
    });

    it("reset reports 0", async () => {
        const {timer, progress} = await mount(90, 30);

        await click(timer, "Reset");

        expect(display(timer)).toBe("1:30");
        expect(progress).toHaveBeenLastCalledWith(0);
    });

    it("opens a large focus view on start; minimize keeps it running", async () => {
        const {timer} = await mount(90);
        timer.label = "Plank";
        await click(timer, "Start");
        const focus = () => timer.shadowRoot!.querySelector(".focus");

        expect(focus()).not.toBeNull();
        expect(focus()!.querySelector(".focus-title")!.textContent).toBe("Plank");
        expect(focus()!.querySelector(".big-time")!.textContent!.trim()).toBe("1:30");

        await click(timer, "Minimize");
        expect(focus()).toBeNull();
        vi.advanceTimersByTime(3_000);
        await timer.updateComplete;
        const small = timer.shadowRoot!.querySelector("button.timer-display") as HTMLElement;
        expect(small.textContent!.trim()).toBe("1:27");

        small.click();
        await timer.updateComplete;
        expect(focus()).not.toBeNull();
    });

    it("reset closes the focus view", async () => {
        const {timer} = await mount(90);
        await click(timer, "Start");

        await click(timer, "Reset");

        expect(timer.shadowRoot!.querySelector(".focus")).toBeNull();
    });

    it("shows Done in the focus view when finished", async () => {
        const {timer} = await mount(2);
        await click(timer, "Start");
        vi.advanceTimersByTime(2_000);
        await timer.updateComplete;

        expect(timer.shadowRoot!.querySelector(".focus .big-time")!.textContent!.trim()).toBe("✓ Done!");
        await click(timer, "Close");
        expect(timer.shadowRoot!.querySelector(".focus")).toBeNull();
    });

    it("focusOnStart off: stays small, the large view is opened by button", async () => {
        const {timer} = await mount(90);
        timer.focusOnStart = false;
        await click(timer, "Start");
        expect(timer.shadowRoot!.querySelector(".focus")).toBeNull();

        (timer.shadowRoot!.querySelector("sl-icon-button") as HTMLElement).click();
        await timer.updateComplete;
        expect(timer.shadowRoot!.querySelector(".focus")).not.toBeNull();
    });

    it("offerDone: a finished timer offers to mark the exercise as done", async () => {
        const {timer} = await mount(2, 2);
        expect(buttons(timer)).toEqual(["Reset"]);
        timer.offerDone = true;
        await timer.updateComplete;
        const markDone = vi.fn();
        timer.addEventListener("mark-done", markDone);

        await click(timer, "Mark as done");

        expect(markDone).toHaveBeenCalledOnce();
    });

    it("with exerciseId: another element takes over the running timer, which saves itself", async () => {
        const save = vi.fn();
        runningTimer.save = save;
        const {timer: card, progress} = await mount(90);
        card.exerciseId = "a";
        await card.updateComplete;
        await click(card, "Start");
        vi.advanceTimersByTime(5_000);
        card.remove();

        const page = document.createElement("exercise-timer") as ExerciseTimer;
        Object.assign(page, {exerciseId: "a", targetSeconds: 90, completedSeconds: 0});
        document.body.append(page);
        await page.updateComplete;
        vi.advanceTimersByTime(5_000);
        page.completedSeconds = 3; // late answer of the server
        await page.updateComplete;
        expect(display(page)).toBe("1:20");

        await click(page, "Pause");
        expect(save.mock.calls).toEqual([["a", 10]]);
        expect(progress).not.toHaveBeenCalled();
        page.remove();
    });

    it("reports progress when removed while running", async () => {
        const {timer, progress} = await mount(90);
        await click(timer, "Start");
        vi.advanceTimersByTime(5_000);

        timer.remove();

        expect(progress).toHaveBeenLastCalledWith(5);
    });
});
