import {createListenerMiddleware, isRejectedWithValue} from "@reduxjs/toolkit";
import {ApiError} from "../../api/http";
import {toast} from "../../components/toast";

/**
 * Shows an error toast for every failed backend call (rejected apiThunk), so failures are not silent.
 */
export const errorToastMiddleware = createListenerMiddleware();

/** Failures that are expected and handled elsewhere (session check, login form, initial user info). */
const SILENT_ACTIONS = new Set(["auth/checkStatus", "user/login", "user/data"]);

export function errorMessage(error?: ApiError): string {
    if (!error) return "Something went wrong.";
    if (error.status === 0) return "Server not reachable. Please check your connection.";
    return error.message || "Something went wrong.";
}

errorToastMiddleware.startListening({
    matcher: isRejectedWithValue,
    effect: action => {
        const type = action.type.replace(/\/rejected$/, "");
        const error = action.payload as ApiError | undefined;
        // 401 = session expired: the auth middleware logs out and redirects instead
        if (SILENT_ACTIONS.has(type) || error?.status === 401) {
            return;
        }
        toast(errorMessage(error), "danger");
    },
});
