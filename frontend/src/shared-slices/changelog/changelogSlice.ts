import {createListenerMiddleware, createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../commons";
import {apiGet, apiPut, apiThunk} from "../../api/http";
import {readUserInfo, registerUser, saveUserInfo} from "../../views/login/slice/userSlice";
import {UserDto} from "../../views/login/models/userDto";

/** One release, newest first (from the backend's changelog.json). */
export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    items: string[];
}

type SliceState = {
    /** The whole changelog (Options → Changelog). */
    entries: ChangelogEntry[];
    status: AsyncStoreState;
    /** Entries the user has not seen yet – shown once after login. */
    unseen: ChangelogEntry[];
}

type SliceProjection = {
    changelog: SliceState
}

const initialState: SliceState = {entries: [], status: "initial", unseen: []};

export const loadChangelog = apiThunk<ChangelogEntry[]>(
    'changelog/load', () => apiGet("/api/changelog"));

export const loadUnseenChangelog = apiThunk<ChangelogEntry[]>(
    'changelog/loadUnseen', () => apiGet("/api/changelog/unseen"));

export const markChangelogSeen = apiThunk<void>(
    'changelog/markSeen', () => apiPut("/api/changelog/seen"));

const changelogSlice = createSlice({
    name: 'changelog',
    initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(loadChangelog.pending, state => {
                state.status = "loading";
            })
            .addCase(loadChangelog.rejected, state => {
                state.status = "error";
            })
            .addCase(loadChangelog.fulfilled, (state, action) => {
                state.status = "idle";
                state.entries = action.payload;
            })
            .addCase(loadUnseenChangelog.fulfilled, (state, action) => {
                state.unseen = action.payload;
            })
            // close the dialog right away; if saving fails it simply shows again next time
            .addCase(markChangelogSeen.pending, state => {
                state.unseen = [];
            });
    }
});

export const changelogReducer: Reducer<SliceState> = changelogSlice.reducer;
export const selectChangelog = (state: SliceProjection) => state.changelog.entries;
export const selectChangelogStatus = (state: SliceProjection) => state.changelog.status;
export const selectUnseenChangelog = (state: SliceProjection) => state.changelog.unseen;

/** Loads the unseen entries whenever a user is (or becomes) logged in. */
export const changelogMiddleware = createListenerMiddleware();

changelogMiddleware.startListening({
    predicate: action => readUserInfo.fulfilled.match(action) || saveUserInfo.fulfilled.match(action)
        || registerUser.fulfilled.match(action),
    effect: (action, api) => {
        const user = (action as { payload?: UserDto }).payload;
        if (user && !user.anonymous) {
            api.dispatch(loadUnseenChangelog());
        }
    },
});
