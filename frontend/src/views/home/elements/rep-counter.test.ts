// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import "./rep-counter";
import {REP_SAVE_DEBOUNCE_MS, RepCounter} from "./rep-counter";

describe("rep-counter", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    async function mount() {
        const counter = document.createElement("rep-counter") as RepCounter;
        counter.target = 20;
        counter.value = 5;
        document.body.append(counter);
        await counter.updateComplete;
        const progress = vi.fn();
        counter.addEventListener("progress-changed", e => progress((e as CustomEvent<number>).detail));
        const input = counter.shadowRoot!.querySelector("sl-input") as unknown as HTMLInputElement;
        const type = (value: string) => {
            input.value = value;
            input.dispatchEvent(new Event("sl-change"));
        };
        return {counter, progress, input, type};
    }

    it("shows value and target", async () => {
        const {counter, input} = await mount();

        expect(input.value).toBe("5");
        expect(counter.shadowRoot!.textContent).toContain("/ 20");
    });

    it("reports only the last of quick changes", async () => {
        const {progress, type} = await mount();

        type("6");
        type("7");
        type("8");
        vi.advanceTimersByTime(REP_SAVE_DEBOUNCE_MS - 1);
        expect(progress).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(progress).toHaveBeenCalledOnce();
        expect(progress).toHaveBeenCalledWith(8);
    });

    it("treats negative or invalid input as 0", async () => {
        const {progress, type} = await mount();

        type("-3");
        vi.advanceTimersByTime(REP_SAVE_DEBOUNCE_MS);
        type("abc");
        vi.advanceTimersByTime(REP_SAVE_DEBOUNCE_MS);

        expect(progress.mock.calls).toEqual([[0], [0]]);
    });
});
