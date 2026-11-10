import {describe, expect, it} from "vitest";
import {LatestValueSync} from "./latest-value-sync";

/** A fake server where each request waits until the test answers it. */
function fakeServer() {
    const requests: { value: boolean, answer: (ok: boolean) => void }[] = [];
    const send = (_key: string, value: boolean) => new Promise<boolean>(resolve => requests.push({value, answer: resolve}));
    return {requests, send};
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe("LatestValueSync", () => {
    it("shows the wanted value at once and sends it", async () => {
        const server = fakeServer();
        const sync = new LatestValueSync(server.send);

        sync.set("a", true, false);

        expect(sync.pending("a")).toBe(true);
        expect(server.requests.map(r => r.value)).toEqual([true]);
        server.requests[0].answer(true);
        await flush();
        expect(sync.pending("a")).toBeUndefined();
    });

    it("fast clicks: one request at a time, then only the latest value", async () => {
        const server = fakeServer();
        const sync = new LatestValueSync(server.send);

        sync.set("a", true, false);   // click: done
        sync.set("a", false, false);  // click: undo
        sync.set("a", true, false);   // click: done
        sync.set("a", false, false);  // click: undo
        sync.set("a", true, false);   // click: done
        expect(server.requests.length).toBe(1);
        expect(sync.pending("a")).toBe(true);

        server.requests[0].answer(true); // server has "done" = latest wish
        await flush();
        expect(server.requests.length).toBe(1);
        expect(sync.pending("a")).toBeUndefined();
    });

    it("sends the latest value after the running request", async () => {
        const server = fakeServer();
        const sync = new LatestValueSync(server.send);

        sync.set("a", true, false);
        sync.set("a", false, false);
        server.requests[0].answer(true);
        await flush();

        expect(server.requests.map(r => r.value)).toEqual([true, false]);
        server.requests[1].answer(true);
        await flush();
        expect(sync.pending("a")).toBeUndefined();
    });

    it("back to the saved value before anything was sent – nothing more to send", async () => {
        const server = fakeServer();
        const sync = new LatestValueSync(server.send);

        sync.set("a", true, false);
        sync.set("a", false, false);
        server.requests[0].answer(false); // the "done" failed: server still has false = wanted
        await flush();

        expect(server.requests.length).toBe(1);
        expect(sync.pending("a")).toBeUndefined();
    });

    it("a failure drops the wish (the UI shows the server value again)", async () => {
        const server = fakeServer();
        let changes = 0;
        const sync = new LatestValueSync(server.send, () => changes++);

        sync.set("a", true, false);
        server.requests[0].answer(false);
        await flush();

        expect(sync.pending("a")).toBeUndefined();
        expect(server.requests.length).toBe(1);
        expect(changes).toBe(2); // wish set, wish dropped
    });

    it("keys are independent", () => {
        const server = fakeServer();
        const sync = new LatestValueSync(server.send);

        sync.set("a", true, false);
        sync.set("b", true, false);

        expect(server.requests.length).toBe(2);
    });
});
