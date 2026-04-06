import {AsyncStoreState} from "../../../commons";
import {createAsyncThunk, createSlice, Reducer} from "@reduxjs/toolkit";

type SliceState = {
    inviteLink: {
        status: AsyncStoreState;
        value: string;
    }
    autoCollapse: boolean;
    optionsStatus: AsyncStoreState;
}

type SliceProjection = {
    options: SliceState
}

const initialState: SliceState = {
    inviteLink: {
        status: "initial",
        value: ""
    },
    autoCollapse: true,
    optionsStatus: "initial"
}

export const generateInviteLink = createAsyncThunk<string, void, { rejectValue: any }>(
    'options/generateInviteLink', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/user/getInviteLink", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: window.location.host,
            credentials: "include"
        });
        if (res.ok) {
            return await res.text();
        } else {
            return rejectWithValue("Failed to generate invite link");
        }
    });

export const loadOptions = createAsyncThunk<{ autoCollapse: boolean }, void, { rejectValue: any }>(
    'options/loadOptions', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/options", {
            credentials: "include"
        });
        if (res.ok) {
            return await res.json();
        } else {
            return rejectWithValue("Failed to load options");
        }
    });

export const setAutoCollapse = createAsyncThunk<boolean, boolean, { rejectValue: any }>(
    'options/setAutoCollapse', async (autoCollapse, {rejectWithValue}) => {
        const res = await fetch("/api/options", {
            method: 'PUT',
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({autoCollapse}),
            credentials: "include"
        });
        if (res.ok) {
            const data = await res.json();
            return data.autoCollapse as boolean;
        } else {
            return rejectWithValue("Failed to save options");
        }
    });

const optionsSlice = createSlice({
    name: 'options',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(generateInviteLink.pending, (state) => {
                state.inviteLink.status = "loading";
            })
            .addCase(generateInviteLink.fulfilled, (state, action) => {
                state.inviteLink.status = "idle";
                state.inviteLink.value = action.payload;
            })
            .addCase(generateInviteLink.rejected, (state) => {
                state.inviteLink.status = "error";
            })
            .addCase(loadOptions.pending, (state) => {
                state.optionsStatus = "loading";
            })
            .addCase(loadOptions.fulfilled, (state, action) => {
                state.optionsStatus = "idle";
                state.autoCollapse = action.payload.autoCollapse;
            })
            .addCase(loadOptions.rejected, (state) => {
                state.optionsStatus = "error";
            })
            .addCase(setAutoCollapse.fulfilled, (state, action) => {
                state.autoCollapse = action.payload;
            });
    }
});

export const optionsReducer: Reducer<SliceState> = optionsSlice.reducer;

export const selectInviteLink = (state: SliceProjection) => state.options.inviteLink.value;
export const selectInviteLinkStatus = (state: SliceProjection) => state.options.inviteLink.status;
export const selectAutoCollapse = (state: SliceProjection) => state.options.autoCollapse;
