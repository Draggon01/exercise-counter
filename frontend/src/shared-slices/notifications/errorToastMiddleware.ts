import {createListenerMiddleware, isRejectedWithValue} from "@reduxjs/toolkit";
import {ApiError, NOT_REACHABLE} from "../../api/http";
import {toast} from "../../components/toast";

/**
 * Shows an error toast for every failed backend call (rejected apiThunk), so failures are not silent.
 */
export const errorToastMiddleware = createListenerMiddleware();

/** Failures that are expected or shown inline elsewhere (session check, login/register forms, initial user info). */
const SILENT_ACTIONS = new Set(["auth/checkStatus", "user/login", "user/data", "user/register", "register/checkUsername", "resetPassword/check", "account/changePassword", "account/delete",
    // shown on the exercise page itself
    "exerciseDetail/load", "exerciseDetail/loadDetails", "exerciseDetail/loadNote",
    // background state of reminders (home page): the options show what is missing instead
    "push/load", "push/reminders"]);

export function errorMessage(error?: ApiError): string {
    if (!error) return "Something went wrong.";
    // status 0 is also used for errors of the browser itself (e.g. push) – those keep their own message
    if (error.status === 0 && (!error.message || error.message === NOT_REACHABLE)) {
        return "Server not reachable. Please check your connection.";
    }
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
