import {createAsyncThunk} from "@reduxjs/toolkit";

/**
 * Error of a failed backend call. A plain object so it can be stored in Redux (rejectValue).
 */
export type ApiError = {
    /** HTTP status, 0 if the request did not reach the server. */
    status: number;
    message: string;
};

/** Message of an {@link ApiError} whose request did not reach the server. */
export const NOT_REACHABLE = "Server not reachable";

/** Thrown by the api* functions for non-2xx responses and network failures. */
export class ApiRequestError extends Error {
    constructor(readonly status: number, message: string) {
        super(message);
        this.name = "ApiRequestError";
    }
}

/** Request body: JSON-serialisable value, or form data (sent as application/x-www-form-urlencoded). */
type Body = unknown;

async function request<T>(method: string, url: string, body?: Body): Promise<T> {
    const init: RequestInit = {method, credentials: "include"};
    if (body instanceof URLSearchParams) {
        init.headers = {"Content-Type": "application/x-www-form-urlencoded"};
        init.body = body;
    } else if (body !== undefined) {
        init.headers = {"Content-Type": "application/json"};
        init.body = JSON.stringify(body);
    }

    let res: Response;
    try {
        res = await fetch(url, init);
    } catch {
        throw new ApiRequestError(0, NOT_REACHABLE);
    }
    if (!res.ok) {
        throw new ApiRequestError(res.status, await errorMessage(res));
    }
    return await parseBody(res) as T;
}

/** JSON → parsed value, text → string, empty body → undefined. */
async function parseBody(res: Response): Promise<unknown> {
    const text = await res.text();
    if (text === "") {
        return undefined;
    }
    const contentType = res.headers.get("Content-Type") ?? "";
    return contentType.includes("json") ? JSON.parse(text) : text;
}

/** Backend errors are {"error": "..."}; Spring MVC errors are ProblemDetail {"detail": "..."}. */
async function errorMessage(res: Response): Promise<string> {
    try {
        const body = await res.json();
        return body.error ?? body.detail ?? body.message ?? res.statusText;
    } catch {
        return res.statusText || `Request failed (${res.status})`;
    }
}

export const apiGet = <T>(url: string) => request<T>("GET", url);
export const apiPost = <T = void>(url: string, body?: Body) => request<T>("POST", url, body);
export const apiPut = <T = void>(url: string, body?: Body) => request<T>("PUT", url, body);
export const apiDelete = <T = void>(url: string, body?: Body) => request<T>("DELETE", url, body);

/**
 * Sends a file as multipart field `file` (PUT), with progress (0–1; `fetch` cannot report it). Aborting rejects.
 */
export function apiUpload<T>(url: string, file: File, options: { onProgress?: (part: number) => void, signal?: AbortSignal } = {}): Promise<T> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const abort = () => xhr.abort();
        const fail = (status: number, message: string) => reject(new ApiRequestError(status, message));
        xhr.open("PUT", url);
        xhr.withCredentials = true;
        xhr.upload.onprogress = e => {
            if (e.lengthComputable) options.onProgress?.(e.loaded / e.total);
        };
        xhr.onload = () => {
            let body: { error?: string, detail?: string } | undefined;
            try {
                body = JSON.parse(xhr.responseText);
            } catch {
                // e.g. an error page of the web server
            }
            if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
            else if (xhr.status === 413) fail(413, body?.error ?? "The file is too large");
            else fail(xhr.status, body?.error ?? body?.detail ?? (xhr.statusText || `Request failed (${xhr.status})`));
        };
        xhr.onerror = () => fail(0, NOT_REACHABLE);
        xhr.onabort = () => fail(0, "Cancelled");
        xhr.onloadend = () => options.signal?.removeEventListener("abort", abort);
        if (options.signal?.aborted) {
            fail(0, "Cancelled");
            return;
        }
        options.signal?.addEventListener("abort", abort);
        const form = new FormData();
        form.append("file", file);
        xhr.send(form);
    });
}

/** Converts anything thrown by a request into a serialisable {@link ApiError}. */
export function toApiError(e: unknown): ApiError {
    if (e instanceof ApiRequestError) {
        return {status: e.status, message: e.message};
    }
    return {status: 0, message: e instanceof Error ? e.message : String(e)};
}

/**
 * createAsyncThunk for a backend call: the payload creator only describes the request,
 * failures are rejected with an {@link ApiError}.
 *
 * @example
 * export const saveCheck = apiThunk<CheckDto, CheckDto>('checks/save', check => apiPost('/api/check/save', check));
 */
export function apiThunk<Returned, Arg = void>(type: string, payloadCreator: (arg: Arg) => Promise<Returned>) {
    return createAsyncThunk<Returned, Arg, { rejectValue: ApiError }>(type, async (arg, {rejectWithValue}) => {
        try {
            return await payloadCreator(arg);
        } catch (e) {
            return rejectWithValue(toApiError(e));
        }
    });
}
