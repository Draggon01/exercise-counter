// @vitest-environment happy-dom
import {describe, expect, it, vi} from "vitest";
import {onAppRefresh, pullDistance, PULL_THRESHOLD, requestAppRefresh} from "./refresh";

describe("pullDistance", () => {
    it("is 0 when pulling up", () => expect(pullDistance(-20)).toBe(0));
    it("follows the finger at half speed", () => expect(pullDistance(100)).toBe(50));
    it("is capped", () => expect(pullDistance(10_000)).toBe(PULL_THRESHOLD * 1.5));
});

describe("app refresh", () => {
    it("calls registered loaders and waits for them", async () => {
        let finish!: () => void;
        const load = vi.fn(() => new Promise<void>(resolve => finish = resolve));
        const off = onAppRefresh(load);

        let done = false;
        const refresh = requestAppRefresh().then(() => done = true);
        expect(load).toHaveBeenCalledOnce();
        await Promise.resolve();
        expect(done).toBe(false);

        finish();
        await refresh;
        expect(done).toBe(true);
        off();
    });

    it("does not call a loader after it was removed", async () => {
        const load = vi.fn();
        onAppRefresh(load)();
        await requestAppRefresh();
        expect(load).not.toHaveBeenCalled();
    });

    it("a failing loader does not break the refresh", async () => {
        const off = onAppRefresh(() => Promise.reject(new Error("offline")));
        await expect(requestAppRefresh()).resolves.toBeUndefined();
        off();
    });
});
