import {AsyncStoreState} from "../../../commons";
import {createSlice, Reducer} from "@reduxjs/toolkit";
import {apiGet, apiPost, apiPut, apiThunk} from "../../../api/http";

type SliceState = {
    inviteLinks: {
        status: AsyncStoreState;
        values: string[];
    }
    autoCollapse: boolean;
    /** reminders come this many hours before the reset (all devices of the user) */
    reminderHours: number;
    optionsStatus: AsyncStoreState;
}

type SliceProjection = {
    options: SliceState
}

const initialState: SliceState = {
    inviteLinks: {
        status: "initial",
        values: []
    },
    autoCollapse: true,
    reminderHours: 3,
    optionsStatus: "initial",
}

export const generateInviteLink = apiThunk<string>(
    'options/generateInviteLink', () => apiPost("/api/invites", {baseUrl: window.location.origin}));

type OptionsDto = { autoCollapse: boolean, reminderHours: number };

export const loadOptions = apiThunk<OptionsDto>(
    'options/loadOptions', () => apiGet("/api/options"));

export const setAutoCollapse = apiThunk<boolean, boolean>(
    'options/setAutoCollapse', async autoCollapse =>
        (await apiPut<OptionsDto>("/api/options", {autoCollapse})).autoCollapse);

export const setReminderHours = apiThunk<number, number>(
    'options/setReminderHours', async reminderHours =>
        (await apiPut<OptionsDto>("/api/options", {reminderHours})).reminderHours);

const optionsSlice = createSlice({
    name: 'options',
    initialState,
    reducers: {
        clearInviteLinks(state) {
            state.inviteLinks.values = [];
            state.inviteLinks.status = "initial";
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(generateInviteLink.pending, (state) => {
                state.inviteLinks.status = "loading";
            })
            .addCase(generateInviteLink.fulfilled, (state, action) => {
                state.inviteLinks.status = "idle";
                state.inviteLinks.values = [...state.inviteLinks.values, action.payload];
            })
            .addCase(generateInviteLink.rejected, (state) => {
                state.inviteLinks.status = "error";
            })
            .addCase(loadOptions.pending, (state) => {
                state.optionsStatus = "loading";
            })
            .addCase(loadOptions.fulfilled, (state, action) => {
                state.optionsStatus = "idle";
                state.autoCollapse = action.payload.autoCollapse;
                state.reminderHours = action.payload.reminderHours;
            })
            .addCase(loadOptions.rejected, (state) => {
                state.optionsStatus = "error";
            })
            .addCase(setAutoCollapse.fulfilled, (state, action) => {
                state.autoCollapse = action.payload;
            })
            .addCase(setReminderHours.fulfilled, (state, action) => {
                state.reminderHours = action.payload;
            });
    }
});

export const optionsReducer: Reducer<SliceState> = optionsSlice.reducer;
export const {clearInviteLinks} = optionsSlice.actions;

export const selectInviteLinks = (state: SliceProjection) => state.options.inviteLinks.values;
export const selectInviteLinkStatus = (state: SliceProjection) => state.options.inviteLinks.status;
export const selectAutoCollapse = (state: SliceProjection) => state.options.autoCollapse;
export const selectReminderHours = (state: SliceProjection) => state.options.reminderHours;
