import {afterEach, describe, expect, it, vi} from "vitest";
import {configureStore} from "@reduxjs/toolkit";

vi.mock("../../components/toast", () => ({toast: vi.fn()}));
import {toast} from "../../components/toast";
import {errorMessage, errorToastMiddleware} from "./errorToastMiddleware";
import {apiGet, apiThunk} from "../../api/http";

function respond(status: number, body: string) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {status, headers: {"Content-Type": "application/json"}})));
}

const store = () => configureStore({
    reducer: (state = {}) => state,
    middleware: getDefault => getDefault().prepend(errorToastMiddleware.middleware),
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(toast).mockClear();
});

describe("errorToastMiddleware", () => {
    it("shows the backend error message for a failed call", async () => {
        respond(403, '{"error":"not the creator"}');
        await store().dispatch(apiThunk("exercise/delete", () => apiGet("/api/x"))());

        expect(toast).toHaveBeenCalledWith("not the creator", "danger");
    });

    it("stays silent for 401 and for expected failures", async () => {
        respond(401, '{"error":"Unauthorized"}');
        await store().dispatch(apiThunk("exercise/list", () => apiGet("/api/x"))());
        respond(500, '{"error":"x"}');
        await store().dispatch(apiThunk("user/login", () => apiGet("/api/x"))());
        await store().dispatch(apiThunk("auth/checkStatus", () => apiGet("/api/x"))());

        expect(toast).not.toHaveBeenCalled();
    });

    it("does nothing for successful calls", async () => {
        respond(200, "[]");
        await store().dispatch(apiThunk("exercise/list", () => apiGet("/api/x"))());

        expect(toast).not.toHaveBeenCalled();
    });
});

describe("errorMessage", () => {
    it("explains network failures", () => {
        expect(errorMessage({status: 0, message: "Server not reachable"})).toBe("Server not reachable. Please check your connection.");
        expect(errorMessage(undefined)).toBe("Something went wrong.");
    });
});
