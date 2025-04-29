import {AsyncStoreState} from "../../../commons";
import {createAsyncThunk, createSlice, Reducer} from "@reduxjs/toolkit";
import {UserDto} from "../models/userDto";

type SliceState = {
    status: AsyncStoreState;
    user: UserDto;
    init: boolean;
}

const initialState: SliceState = {
    status: "initial",
    user: {username: "", anonymous: true},
    init: false
}

type SliceProjection = {
    user: SliceState
}

export const readUserInfo = createAsyncThunk<any, void, { rejectValue: any }>(
    'user/data', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/public/userinfo", {
            method: 'POST',
            credentials: 'include'
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    });

export const logoutUser = createAsyncThunk<any, void, { rejectValue: any }>(
    'user/logout', async (_, {rejectWithValue}) => {
        await fetch("/api/logout", {
            method: 'POST',
            credentials: 'include'
        });

        const res = await fetch("/api/public/userinfo", {
            method: 'POST',
        });

        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    });

export const saveUserInfo = createAsyncThunk<any, any, { rejectValue: any }>(
    'user/login', async (data, {rejectWithValue}) => {
        await fetch("/api/login", {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: data,
            credentials: "include"
        });

        const res = await fetch("api/public/userinfo", {
            method: 'POST',
            credentials: 'include'
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    });

export const userSlice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(readUserInfo.pending, state => {
                state.status = 'initial';
            })
            .addCase(readUserInfo.rejected, state => {
                state.status = 'error';
            })
            .addCase(readUserInfo.fulfilled, (state, action) => {
                state.status = 'idle';
                state.user = action.payload;
                state.init = true;
            })
            .addCase(saveUserInfo.pending, state => {
                state.status = 'initial';
            })
            .addCase(saveUserInfo.rejected, state => {
                state.status = 'error';
            })
            .addCase(saveUserInfo.fulfilled, (state, action) => {
                state.status = 'idle';
                state.user = action.payload;
                state.init = true;
            })
            .addCase(logoutUser.pending, state => {
                state.status = 'initial';
            })
            .addCase(logoutUser.rejected, state => {
                state.status = 'error';
            })
            .addCase(logoutUser.fulfilled, (state, action) => {
                state.status = 'idle';
                state.user = action.payload;
                state.init = true;
            })
    }
});

export const selectCurrentUser = ((state: SliceProjection) => state.user.user)
export const selectUserInit = ((state: SliceProjection) => state.user.init)
export const userReducer = userSlice.reducer as Reducer<SliceState>