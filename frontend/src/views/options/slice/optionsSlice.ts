import {AsyncStoreState} from "../../../commons";
import {createAsyncThunk, createSlice, Reducer} from "@reduxjs/toolkit";

type SliceState = {
    inviteLink: {
        status: AsyncStoreState;
        value: string;
    }
}

type SliceProjection = {
    options: SliceState
}

const initialState: SliceState = {
    inviteLink: {
        status: "initial",
        value: ""
    }
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
            });
    }
});

export const optionsReducer: Reducer<SliceState> = optionsSlice.reducer;

export const selectInviteLink = (state: SliceProjection) => state.options.inviteLink.value;
export const selectInviteLinkStatus = (state: SliceProjection) => state.options.inviteLink.status;
