import { createListenerMiddleware } from '@reduxjs/toolkit';
import { checkAuthStatus } from './authSlice';
import {navigate} from "../../lit-router";
import {CustomRouter} from "../../index";
import {store} from "../../store";
import {logoutUser} from "../../views/login/slice/userSlice";

export const authMiddleware = createListenerMiddleware();

authMiddleware.startListening({
    actionCreator: checkAuthStatus.rejected,
    effect: async () => {
        console.log("Unauthorized");
        await store.dispatch(logoutUser());
        await CustomRouter.goto("/");
    }
});