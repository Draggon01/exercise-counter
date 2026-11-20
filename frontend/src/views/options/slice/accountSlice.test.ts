import {afterEach, describe, expect, it, vi} from "vitest";
import {configureStore} from "@reduxjs/toolkit";
import {accountReducer, deleteAccount} from "./accountSlice";

const store = () => configureStore({reducer: {account: accountReducer}});

describe("deleteAccount", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("sends DELETE /api/account with the password as JSON", async () => {
        const fetch = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
        vi.stubGlobal("fetch", fetch);

        const result = await store().dispatch(deleteAccount("secret-password"));

        expect(deleteAccount.fulfilled.match(result)).toBe(true);
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe("/api/account");
        expect(init.method).toBe("DELETE");
        expect(JSON.parse(init.body)).toEqual({password: "secret-password"});
    });

    it("a wrong password is rejected with status 400", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({error: "The current password is wrong"}),
            {status: 400, headers: {"Content-Type": "application/json"}})));

        const result = await store().dispatch(deleteAccount("wrong"));

        expect(deleteAccount.rejected.match(result)).toBe(true);
        expect(result.payload?.status).toBe(400);
    });
});
