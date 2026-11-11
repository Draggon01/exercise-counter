import {createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../../commons";
import {apiGet, apiPost, apiThunk} from "../../../api/http";

/** The public page of a password reset link (/reset-password/:token). */
type ResetPasswordState = {
    /** checking the link: loading → idle (valid) / error (unknown, used or expired) */
    status: AsyncStoreState;
    username: string;
};

type SliceProjection = { resetPassword: ResetPasswordState };

const initialState: ResetPasswordState = {status: "initial", username: ""};

const url = (token: string) => `/api/public/password-resets/${encodeURIComponent(token)}`;

/** Silent (no error toast): an invalid link is shown on the page itself. */
export const checkResetLink = apiThunk<{ username: string }, string>(
    'resetPassword/check', token => apiGet(url(token)));

export const setNewPassword = apiThunk<void, { token: string, newPassword: string }>(
    'resetPassword/set', ({token, newPassword}) => apiPost(url(token), {newPassword}));

const resetPasswordSlice = createSlice({
    name: "resetPassword",
    initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(checkResetLink.pending, state => {
                state.status = "loading";
            })
            .addCase(checkResetLink.fulfilled, (state, action) => {
                state.status = "idle";
                state.username = action.payload.username;
            })
            .addCase(checkResetLink.rejected, state => {
                state.status = "error";
            });
    },
});

export const resetPasswordReducer: Reducer<ResetPasswordState> = resetPasswordSlice.reducer;

export const selectResetPassword = (state: SliceProjection) => state.resetPassword;
