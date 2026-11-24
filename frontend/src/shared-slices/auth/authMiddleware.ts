import {createListenerMiddleware, isAnyOf, isRejectedWithValue, ListenerEffectAPI, PayloadAction} from '@reduxjs/toolkit';
import {checkAuthStatus} from './authSlice';
import {ApiError} from "../../api/http";
import {toast} from "../../components/toast";
import {navigate} from "../../utils/navigation";
import {runningTimer} from "../../utils/running-timer";
import type {AppDispatch, RootState} from "../../store";
import type {UserDto} from "../../views/login/models/userDto";
import {logoutUser, readUserInfo, registerUser, saveUserInfo} from "../../views/login/slice/userSlice";

/**
 * Keeps track of the session: while somebody is logged in it is checked regularly, and as soon as any request is
 * answered with 401 the user is logged out here and sent to the login page.
 */
export const authMiddleware = createListenerMiddleware();

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

let healthCheckInterval: ReturnType<typeof setInterval> | undefined;
let stopChecks: (() => void) | undefined;
let endingSession = false;

function startChecks(dispatch: AppDispatch) {
    stopChecks?.();
    const check = () => void dispatch(checkAuthStatus());
    // back in the app after a while: know at once, not only after the next interval
    const onVisible = () => {
        if (document.visibilityState === "visible") check();
    };
    healthCheckInterval = setInterval(check, HEALTH_CHECK_INTERVAL);
    document.addEventListener("visibilitychange", onVisible);
    stopChecks = () => {
        clearInterval(healthCheckInterval);
        document.removeEventListener("visibilitychange", onVisible);
        stopChecks = undefined;
    };
}

// logged in: just now, or already when the app was opened
authMiddleware.startListening({
    matcher: isAnyOf(saveUserInfo.fulfilled, registerUser.fulfilled, readUserInfo.fulfilled),
    effect: (action, api) => {
        if (!(action as PayloadAction<UserDto>).payload.anonymous) {
            startChecks(api.dispatch as AppDispatch);
        }
    }
});

// Save the progress of a running timer while the session still exists
authMiddleware.startListening({
    actionCreator: logoutUser.pending,
    effect: () => runningTimer.pause()
});

authMiddleware.startListening({
    actionCreator: logoutUser.fulfilled,
    effect: () => stopChecks?.()
});

// 401 = the session is over (being offline or a server error is not)
authMiddleware.startListening({
    matcher: isRejectedWithValue,
    effect: async (action, api) => {
        const {dispatch, getState} = api as ListenerEffectAPI<RootState, AppDispatch>;
        const status = (action.payload as ApiError | undefined)?.status;
        if (status !== 401 || endingSession || getState().user.user.anonymous) {
            return; // e.g. wrong password on the login page
        }
        endingSession = true; // several requests usually fail at once
        try {
            stopChecks?.();
            await dispatch(logoutUser());
            toast("Your session has ended. Please log in again.", "warning");
            navigate("/login");
        } finally {
            endingSession = false;
        }
    }
});
