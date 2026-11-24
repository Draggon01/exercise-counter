// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {store} from "../../store";
import {logoutUser, readUserInfo, saveUserInfo} from "../../views/login/slice/userSlice";
import {listExercisesSelected} from "../../views/home/slice/exerciseSlice";
import {listUserChecks} from "../../views/home/slice/checkSlice";

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {status, headers: {"Content-Type": "application/json"}});

describe("session", () => {
    /** Status of every request that needs a session; 0 = offline. */
    let sessionStatus: number;
    let calls: string[];

    beforeEach(async () => {
        vi.useFakeTimers();
        (window as unknown as {happyDOM: {setURL(url: string): void}}).happyDOM.setURL("http://localhost/");
        sessionStatus = 200;
        calls = [];
        vi.stubGlobal("fetch", vi.fn(async (url: string) => {
            calls.push(url);
            if (url === "/api/logout") return json({});
            if (url === "/api/login") return json({error: "Login failed"}, 401);
            if (url === "/api/public/userinfo") return json({username: "leo", anonymous: calls.includes("/api/logout")});
            if (sessionStatus === 0) throw new TypeError("offline");
            return json(sessionStatus === 200 ? [] : {error: "x"}, sessionStatus);
        }));
        await store.dispatch(readUserInfo()); // app opened while logged in
    });

    afterEach(async () => {
        await store.dispatch(logoutUser());
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    const settle = () => vi.advanceTimersByTimeAsync(10);

    it("401 of any request leads to the login page, once", async () => {
        sessionStatus = 401;
        await Promise.all([store.dispatch(listExercisesSelected()), store.dispatch(listUserChecks())]);
        await settle();

        expect(window.location.pathname).toBe("/login");
        expect(store.getState().user.user.anonymous).toBe(true);
        expect(calls.filter(url => url === "/api/logout")).toHaveLength(1);
    });

    it("is checked regularly after the app was opened while logged in", async () => {
        sessionStatus = 401;
        await vi.advanceTimersByTimeAsync(31_000);

        expect(calls).toContain("/api/auth/check");
        expect(window.location.pathname).toBe("/login");
    });

    it.each([0, 500])("status %i does not log out", async status => {
        sessionStatus = status;
        await store.dispatch(listExercisesSelected());
        await vi.advanceTimersByTimeAsync(31_000);

        expect(window.location.pathname).toBe("/");
        expect(calls).not.toContain("/api/logout");
    });

    it("a wrong password on the login page is not an ended session", async () => {
        await store.dispatch(logoutUser());
        calls = [];
        await store.dispatch(saveUserInfo(new URLSearchParams()));
        await settle();

        expect(calls).toEqual(["/api/login"]);
    });
});
