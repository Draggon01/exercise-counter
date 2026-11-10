import {afterEach, describe, expect, it, vi} from "vitest";
import {configureStore} from "@reduxjs/toolkit";
import {changelogMiddleware, changelogReducer, loadUnseenChangelog, markChangelogSeen} from "./changelogSlice";
import {readUserInfo} from "../../views/login/slice/userSlice";

const entry = {version: "0.7", date: "2026-11-10", title: "t", items: ["i"]};

describe("changelogSlice", () => {
    it("stores unseen entries and clears them as soon as they are marked seen", () => {
        let state = changelogReducer(undefined, loadUnseenChangelog.fulfilled([entry], "r1"));
        expect(state.unseen).toEqual([entry]);

        state = changelogReducer(state, markChangelogSeen.pending("r2"));
        expect(state.unseen).toEqual([]);
    });
});

describe("changelogMiddleware", () => {
    afterEach(() => vi.unstubAllGlobals());

    function storeWithFetch() {
        const fetchMock = vi.fn().mockResolvedValue(new Response("[]", {status: 200, headers: {"Content-Type": "application/json"}}));
        vi.stubGlobal("fetch", fetchMock);
        const store = configureStore({
            reducer: {changelog: changelogReducer},
            middleware: getDefault => getDefault().prepend(changelogMiddleware.middleware),
        });
        return {store, fetchMock};
    }

    it("loads unseen entries when a user is logged in", async () => {
        const {store, fetchMock} = storeWithFetch();

        store.dispatch(readUserInfo.fulfilled({username: "me", anonymous: false}, "r1"));
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/changelog/unseen", expect.anything()));
    });

    it("does nothing for anonymous visitors", async () => {
        const {store, fetchMock} = storeWithFetch();

        store.dispatch(readUserInfo.fulfilled({username: "", anonymous: true}, "r1"));
        await new Promise(r => setTimeout(r, 10));

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
