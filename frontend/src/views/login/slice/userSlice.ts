import {AsyncStoreState} from "../../../commons";
import {createSlice, Reducer} from "@reduxjs/toolkit";
import {UserDto} from "../models/userDto";
import {RegisterDto} from "../../register/model/registerDto";
import {apiPost, apiThunk} from "../../../api/http";

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

const readCurrentUser = () => apiPost<UserDto>("/api/public/userinfo");

/** Who is logged in (anonymous user if nobody). */
export const readUserInfo = apiThunk<UserDto>(
    'user/data', readCurrentUser);

export const logoutUser = apiThunk<UserDto>(
    'user/logout', async () => {
        await apiPost("/api/logout");
        return readCurrentUser();
    });

/** Logs in with form data (username, password); rejects on wrong credentials. */
export const saveUserInfo = apiThunk<UserDto, URLSearchParams>(
    'user/login', async credentials => {
        await apiPost("/api/login", credentials);
        return readCurrentUser();
    });

/** Registers with an invite link and logs the new user in. */
export const registerUser = apiThunk<UserDto, RegisterDto>(
    'user/register', async data => {
        await apiPost("/api/public/register", data);
        await apiPost("/api/login", new URLSearchParams({username: data.username, password: data.password}));
        return readCurrentUser();
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
            .addCase(registerUser.pending, state => {
                state.status = 'initial';
            })
            .addCase(registerUser.rejected, state => {
                state.status = 'error';
            })
            .addCase(registerUser.fulfilled, (state, action) => {
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