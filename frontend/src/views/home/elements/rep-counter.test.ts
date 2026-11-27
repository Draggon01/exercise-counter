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

    it("compact: − and + change the value, never below 0", async () => {
        const {counter, progress} = await mount();
        counter.compact = true;
        counter.value = 1;
        await counter.updateComplete;
        const [minus, plus] = counter.shadowRoot!.querySelectorAll<HTMLElement>("sl-button");

        plus.click();
        plus.click();
        vi.advanceTimersByTime(REP_SAVE_DEBOUNCE_MS);
        [1, 2, 3, 4].forEach(() => minus.click());
        vi.advanceTimersByTime(REP_SAVE_DEBOUNCE_MS);

        expect(progress.mock.calls).toEqual([[3], [0]]);
    });

    describe("compact on a touch screen: tap outside after typing", () => {
        const touch = (coarse: boolean) => vi.stubGlobal("matchMedia",
            (query: string) => ({matches: coarse && query === "(pointer: coarse)"}));
        afterEach(() => {
            document.body.replaceChildren(); // removed counters end their guard
            vi.unstubAllGlobals();
        });

        async function editing(coarse = true) {
            touch(coarse);
            const mounted = await mount();
            mounted.counter.compact = true;
            await mounted.counter.updateComplete;
            const input = mounted.counter.shadowRoot!.querySelector("sl-input")!;
            const outside = document.createElement("button");
            document.body.append(outside);
            const opened = vi.fn();
            outside.addEventListener("click", opened);
            input.dispatchEvent(new Event("sl-focus"));
            input.dispatchEvent(new Event("sl-blur"));
            return {...mounted, input, outside, opened};
        }

        it("only ends the input, the card below is not opened", async () => {
            const {outside, opened} = await editing();
            outside.click();
            expect(opened).not.toHaveBeenCalled();

            outside.click(); // the next tap works again
            expect(opened).toHaveBeenCalledTimes(1);
        });

        it("− / + of the same counter keep working", async () => {
            const {counter, progress} = await editing();
            counter.shadowRoot!.querySelectorAll<HTMLElement>("sl-button")[1].click();
            vi.advanceTimersByTime(REP_SAVE_DEBOUNCE_MS);
            expect(progress).toHaveBeenLastCalledWith(6);
        });

        it("a later tap (keyboard closed with Done) works normally", async () => {
            const {outside, opened} = await editing();
            vi.advanceTimersByTime(1000);
            outside.click();
            expect(opened).toHaveBeenCalledTimes(1);
        });

        it("with a mouse every click works as usual", async () => {
            const {outside, opened} = await editing(false);
            outside.click();
            expect(opened).toHaveBeenCalledTimes(1);
        });

        it("Enter closes the keyboard", async () => {
            const {input} = await editing();
            const blur = vi.spyOn(input as HTMLElement, "blur");
            input.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter"}));
            expect(blur).toHaveBeenCalled();
        });
    });

    it("reports the last change when removed before the delay is over", async () => {
        const {counter, progress, type} = await mount();
        type("9");
        counter.remove();
        vi.advanceTimersByTime(REP_SAVE_DEBOUNCE_MS);
        expect(progress.mock.calls).toEqual([[9]]);
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
