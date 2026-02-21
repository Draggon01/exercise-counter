import { createListenerMiddleware } from '@reduxjs/toolkit';
import { checkAuthStatus } from './authSlice';
import {navigate} from "../../lit-router";
import {CustomRouter} from "../../index";
import {store} from "../../store";
import {logoutUser, saveUserInfo} from "../../views/login/slice/userSlice";

export const authMiddleware = createListenerMiddleware();

let healthCheckInterval: number | null = null;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds


// Start interval on successful login
authMiddleware.startListening({
    actionCreator: saveUserInfo.fulfilled,
    effect: () => {
        // Clear existing interval if any
        if (healthCheckInterval !== null) {
            clearInterval(healthCheckInterval);
        }

        // Start new interval
        healthCheckInterval = window.setInterval(() => {
            store.dispatch(checkAuthStatus());
        }, HEALTH_CHECK_INTERVAL);
    }
});

// Stop interval on logout
authMiddleware.startListening({
    actionCreator: logoutUser.fulfilled,
    effect: () => {
        if (healthCheckInterval !== null) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
        }
    }
});

// Stop interval and redirect on auth failure
authMiddleware.startListening({
    actionCreator: checkAuthStatus.rejected,
    effect: async () => {
        if (healthCheckInterval !== null) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
        }
        await store.dispatch(logoutUser());
        await CustomRouter.goto("/");    }
});
