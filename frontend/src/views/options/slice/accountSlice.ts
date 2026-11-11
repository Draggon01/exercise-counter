import {createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../../commons";
import {apiGet, apiPost, apiPut, apiThunk} from "../../../api/http";

/** Own password, and for admins: reset links for people who forgot theirs. */
export type PasswordResetLinkDto = { link: string, username: string, expiresAt: string };

type AccountState = {
    usernames: string[];
    usernamesStatus: AsyncStoreState;
    /** the last created reset link (shown once – the server only keeps its hash) */
    resetLink: PasswordResetLinkDto | null;
};

type SliceProjection = { account: AccountState };

const initialState: AccountState = {usernames: [], usernamesStatus: "initial", resetLink: null};

export const changePassword = apiThunk<void, { currentPassword: string, newPassword: string }>(
    'account/changePassword', request => apiPut("/api/account/password", request));

export const loadUsernames = apiThunk<string[]>(
    'account/loadUsernames', () => apiGet("/api/admin/users"));

export const createResetLink = apiThunk<PasswordResetLinkDto, string>(
    'account/createResetLink', username =>
        apiPost("/api/admin/password-resets", {username, baseUrl: window.location.origin}));

const accountSlice = createSlice({
    name: "account",
    initialState,
    reducers: {
        clearResetLink(state) {
            state.resetLink = null;
        },
    },
    extraReducers: builder => {
        builder
            .addCase(loadUsernames.pending, state => {
                state.usernamesStatus = "loading";
            })
            .addCase(loadUsernames.fulfilled, (state, action) => {
                state.usernamesStatus = "idle";
                state.usernames = action.payload;
            })
            .addCase(loadUsernames.rejected, state => {
                state.usernamesStatus = "error";
            })
            .addCase(createResetLink.fulfilled, (state, action) => {
                state.resetLink = action.payload;
            });
    },
});

export const accountReducer: Reducer<AccountState> = accountSlice.reducer;
export const {clearResetLink} = accountSlice.actions;

export const selectUsernames = (state: SliceProjection) => state.account.usernames;
export const selectResetLink = (state: SliceProjection) => state.account.resetLink;
