import {afterEach, describe, expect, it, vi} from "vitest";
import {configureStore} from "@reduxjs/toolkit";
import {apiDelete, apiGet, apiPost, apiPut, apiThunk, ApiRequestError, apiUpload, toApiError} from "./http";

function respond(status: number, body?: string, contentType = "application/json") {
    const fetchMock = vi.fn().mockResolvedValue(new Response(body ?? null, {
        status,
        headers: body === undefined ? {} : {"Content-Type": contentType},
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("request bodies", () => {
    it("sends JSON with credentials", async () => {
        const fetchMock = respond(200, "{}");

        await apiPost("/api/x", {a: 1});

        expect(fetchMock).toHaveBeenCalledWith("/api/x", {
            method: "POST",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
            body: '{"a":1}',
        });
    });

    it("sends URLSearchParams as form data", async () => {
        const fetchMock = respond(200, "{}");
        const form = new URLSearchParams({username: "u", password: "p"});

        await apiPost("/api/login", form);

        const init = fetchMock.mock.calls[0][1];
        expect(init.headers).toEqual({"Content-Type": "application/x-www-form-urlencoded"});
        expect(init.body).toBe(form);
    });

    it("sends no body and no content type without a body", async () => {
        const fetchMock = respond(204);

        await apiPut("/api/selection/1");

        expect(fetchMock.mock.calls[0][1]).toEqual({method: "PUT", credentials: "include"});
    });
});

describe("responses", () => {
    it("parses JSON", async () => {
        respond(200, '{"value":42}');
        await expect(apiGet("/api/log/1")).resolves.toEqual({value: 42});
    });

    it("returns plain text as string", async () => {
        respond(200, "http://localhost/register/abc", "text/plain;charset=UTF-8");
        await expect(apiPost<string>("/api/invites", {})).resolves.toBe("http://localhost/register/abc");
    });

    it("returns undefined for an empty body", async () => {
        respond(204);
        await expect(apiDelete("/api/exercises/1")).resolves.toBeUndefined();
    });

    it("parses JSON booleans", async () => {
        respond(200, "false");
        await expect(apiGet<boolean>("/api/public/username-available?username=x")).resolves.toBe(false);
    });
});

describe("errors", () => {
    it("uses the backend {error} message and status", async () => {
        respond(403, '{"error":"not the creator"}');
        await expect(apiDelete("/api/exercises/1")).rejects.toEqual(new ApiRequestError(403, "not the creator"));
    });

    it("falls back to ProblemDetail detail", async () => {
        respond(400, '{"detail":"Failed to convert"}');
        await expect(apiGet("/api/statistic/x")).rejects.toMatchObject({status: 400, message: "Failed to convert"});
    });

    it("handles a non-JSON error body", async () => {
        respond(500, "<html>oops</html>", "text/html");
        await expect(apiGet("/api/x")).rejects.toMatchObject({status: 500});
    });

    it("reports network failures with status 0", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
        await expect(apiGet("/api/x")).rejects.toMatchObject({status: 0, message: "Server not reachable"});
    });

    it("toApiError makes thrown values serialisable", () => {
        expect(toApiError(new ApiRequestError(404, "Not found"))).toEqual({status: 404, message: "Not found"});
        expect(toApiError(new Error("boom"))).toEqual({status: 0, message: "boom"});
        expect(toApiError("text")).toEqual({status: 0, message: "text"});
    });
});

describe("apiThunk", () => {
    const store = () => configureStore({reducer: (state = {}) => state});

    it("fulfils with the response", async () => {
        respond(200, '[{"id":1}]');
        const load = apiThunk<{ id: number }[]>("test/load", () => apiGet("/api/x"));

        const result = await store().dispatch(load());

        expect(load.fulfilled.match(result)).toBe(true);
        expect(result.payload).toEqual([{id: 1}]);
    });

    it("rejects with an ApiError payload", async () => {
        respond(401, '{"error":"Unauthorized"}');
        const load = apiThunk<unknown>("test/load", () => apiGet("/api/x"));

        const result = await store().dispatch(load());

        expect(load.rejected.match(result)).toBe(true);
        expect(result.payload).toEqual({status: 401, message: "Unauthorized"});
    });
});

describe("uploads", () => {
    class FakeXhr {
        static last: FakeXhr;
        upload: { onprogress?: (e: unknown) => void } = {};
        status = 0;
        statusText = "";
        responseText = "";
        withCredentials = false;
        onload = () => {};
        onerror = () => {};
        onabort = () => {};
        onloadend = () => {};
        sent?: FormData;
        constructor() { FakeXhr.last = this; }
        open = vi.fn();
        send = (form: FormData) => { this.sent = form; };
        abort = () => this.onabort();
        answer(status: number, text: string) {
            this.status = status;
            this.responseText = text;
            this.onload();
            this.onloadend();
        }
    }
    const file = new File(["x"], "clip.mp4", {type: "video/mp4"});
    const upload = (options = {}) => {
        vi.stubGlobal("XMLHttpRequest", FakeXhr);
        return apiUpload<{ a: number }>("/api/u", file, options);
    };

    it("sends the file and reports progress", async () => {
        const onProgress = vi.fn();
        const result = upload({onProgress});
        FakeXhr.last.upload.onprogress!({lengthComputable: true, loaded: 1, total: 4});
        FakeXhr.last.answer(202, '{"a":1}');
        expect(await result).toEqual({a: 1});
        expect(onProgress).toHaveBeenCalledWith(0.25);
        expect(FakeXhr.last.open).toHaveBeenCalledWith("PUT", "/api/u");
        expect((FakeXhr.last.sent!.get("file") as File).name).toBe("clip.mp4");
    });

    it("passes on the backend's message, also explains a 413 of the web server", async () => {
        let result = upload();
        FakeXhr.last.answer(400, '{"error":"not a video"}');
        await expect(result).rejects.toMatchObject({status: 400, message: "not a video"});
        result = upload();
        FakeXhr.last.answer(413, "<html>nginx</html>");
        await expect(result).rejects.toMatchObject({status: 413, message: "The file is too large"});
    });

    it("can be cancelled and notices a lost connection", async () => {
        const controller = new AbortController();
        let result = upload({signal: controller.signal});
        controller.abort();
        await expect(result).rejects.toMatchObject({message: "Cancelled"});
        result = upload();
        FakeXhr.last.onerror();
        await expect(result).rejects.toMatchObject({status: 0, message: "Server not reachable"});
    });
});
