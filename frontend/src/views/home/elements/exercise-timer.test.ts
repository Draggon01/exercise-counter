// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import "./exercise-timer";
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

    it("reports progress when removed while running", async () => {
        const {timer, progress} = await mount(90);
        await click(timer, "Start");
        vi.advanceTimersByTime(5_000);

        timer.remove();

        expect(progress).toHaveBeenLastCalledWith(5);
    });
});
