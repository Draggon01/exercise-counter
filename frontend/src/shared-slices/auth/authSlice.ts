import {AsyncStoreState} from "../../commons";
import {UserDto} from "../../views/login/models/userDto";
import {createSlice, Reducer} from "@reduxjs/toolkit";
import {authMiddleware} from "./authMiddleware";
import {apiGet, apiThunk} from "../../api/http";

type SliceState = {
    status: AsyncStoreState;
    isAuthenticated: boolean;
    lastChecked: number;
}

const initialState: SliceState = {
    status: "initial",
    isAuthenticated: false,
    lastChecked: Date.now()
}

type SliceProjection = {
    auth: SliceState
}


/** Rejects when the session is no longer valid. */
export const checkAuthStatus = apiThunk<{ authenticated: boolean }>(
    'auth/checkStatus', async () => {
        await apiGet("/api/auth/check");
        return {authenticated: true};
    });

const authSlice = createSlice({
    name: 'auth',
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(checkAuthStatus.fulfilled, (state) => {
                state.isAuthenticated = true;
                state.lastChecked = Date.now();
            })
            .addCase(checkAuthStatus.rejected, (state) => {
                state.isAuthenticated = false;
                state.lastChecked = Date.now();
            });
    }
});

export const authReducer = authSlice.reducer as Reducer<SliceState>;