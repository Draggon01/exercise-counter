// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {Countdown} from "./countdown";
import {runningTimer} from "./running-timer";

const countdown = (target: number, done = 0) => {
    const c = new Countdown();
    c.set(target, done);
    return c;
};
const go = (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
};

describe("runningTimer", () => {
    const save = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();
        (window as unknown as {happyDOM: {setURL(url: string): void}}).happyDOM.setURL("http://localhost/");
        runningTimer.save = save;
        save.mockClear();
    });

    afterEach(() => {
        runningTimer.pause();
        vi.useRealTimers();
    });

    it("keeps running from card to page and back", () => {
        runningTimer.start("a", countdown(90));
        go("/exercises/a");
        vi.advanceTimersByTime(5_000);
        go("/");
        vi.advanceTimersByTime(5_000);

        expect(runningTimer.of("a")?.secondsLeft).toBe(80);
        expect(runningTimer.of("b")).toBeUndefined();
        expect(save).not.toHaveBeenCalled();
    });

    it.each(["/options", "/exercises/new", "/exercises/a/edit", "/login"])("is paused and saved on %s", path => {
        runningTimer.start("a", countdown(90));
        vi.advanceTimersByTime(5_000);

        go(path);

        expect(save.mock.calls).toEqual([["a", 5]]);
        expect(runningTimer.of("a")).toBeUndefined();
    });

    it("starting a second timer pauses and saves the first", () => {
        const first = countdown(90);
        runningTimer.start("a", first);
        vi.advanceTimersByTime(3_000);

        runningTimer.start("b", countdown(60));

        expect(save.mock.calls).toEqual([["a", 3]]);
        expect(first.running).toBe(false);
        expect(runningTimer.of("b")?.running).toBe(true);
    });

    it("finishing saves the full time and frees the place", () => {
        const changed = vi.fn();
        const unsubscribe = runningTimer.subscribe(changed);
        runningTimer.start("a", countdown(3));
        vi.advanceTimersByTime(3_000);

        expect(save.mock.calls).toEqual([["a", 3]]);
        expect(runningTimer.of("a")).toBeUndefined();
        expect(changed).toHaveBeenCalledTimes(2);
        unsubscribe();
    });
});

describe("Countdown", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("follows the clock when ticks are missing (app in the background)", () => {
        const c = countdown(90);
        c.start();
        vi.setSystemTime(Date.now() + 30_000);
        vi.advanceTimersByTime(1_000);

        expect(c.secondsLeft).toBe(59);
        c.pause();
    });

    it("does not start without time left", () => {
        const c = countdown(10, 10);
        c.start();
        expect(c.running).toBe(false);
    });
});
