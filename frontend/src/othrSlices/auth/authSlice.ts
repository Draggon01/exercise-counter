import {AsyncStoreState} from "../../commons";
import {UserDto} from "../../views/login/models/userDto";
import {createAsyncThunk, createSlice, Reducer} from "@reduxjs/toolkit";
import {authMiddleware} from "./authMiddleware";

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


export const checkAuthStatus = createAsyncThunk(
    'auth/checkStatus',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/auth/check', {
                credentials: 'include'
            });
            if (!response.ok) {
                return rejectWithValue('Unauthorized');
            }
            return { authenticated: true };
        } catch (error) {
            return rejectWithValue('Failed to check auth');
        }
    }
);

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