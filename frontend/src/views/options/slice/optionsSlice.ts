import {AsyncStoreState} from "../../../commons";
import {createSlice, Reducer} from "@reduxjs/toolkit";
import {browserTimeZone} from "../../../utils/exercise";
import {apiGet, apiPost, apiPut, apiThunk} from "../../../api/http";

type SliceState = {
    inviteLinks: {
        status: AsyncStoreState;
        values: string[];
    }
    autoCollapse: boolean;
    /** reminders come this many hours before the reset (all devices of the user) */
    reminderHours: number;
    /** no reminders from quietFrom to quietUntil (full hours, the user's time zone) */
    quietHours: QuietHours;
    optionsStatus: AsyncStoreState;
}

export type QuietHours = { on: boolean, from: number, until: number };

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
    quietHours: {on: false, from: 22, until: 7},
    optionsStatus: "initial",
}

export const generateInviteLink = apiThunk<string>(
    'options/generateInviteLink', () => apiPost("/api/invites", {baseUrl: window.location.origin}));

type OptionsDto = {
    autoCollapse: boolean, reminderHours: number,
    quietHours: boolean, quietFrom: number, quietUntil: number, timeZone: string | null
};

const toQuietHours = (dto: OptionsDto): QuietHours => ({on: dto.quietHours, from: dto.quietFrom, until: dto.quietUntil});

export const loadOptions = apiThunk<OptionsDto>(
    'options/loadOptions', () => apiGet("/api/options"));

export const setAutoCollapse = apiThunk<boolean, boolean>(
    'options/setAutoCollapse', async autoCollapse =>
        (await apiPut<OptionsDto>("/api/options", {autoCollapse})).autoCollapse);

export const setReminderHours = apiThunk<number, number>(
    'options/setReminderHours', async reminderHours =>
        (await apiPut<OptionsDto>("/api/options", {reminderHours})).reminderHours);

/** Sends the browser's time zone along: the hours are meant in local time. */
export const setQuietHours = apiThunk<QuietHours, QuietHours>(
    'options/setQuietHours', async quiet => toQuietHours(await apiPut<OptionsDto>("/api/options", {
        quietHours: quiet.on, quietFrom: quiet.from, quietUntil: quiet.until, timeZone: browserTimeZone()
    })));

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
                state.quietHours = toQuietHours(action.payload);
            })
            .addCase(loadOptions.rejected, (state) => {
                state.optionsStatus = "error";
            })
            .addCase(setAutoCollapse.fulfilled, (state, action) => {
                state.autoCollapse = action.payload;
            })
            .addCase(setReminderHours.fulfilled, (state, action) => {
                state.reminderHours = action.payload;
            })
            .addCase(setQuietHours.fulfilled, (state, action) => {
                state.quietHours = action.payload;
            });
    }
});

export const optionsReducer: Reducer<SliceState> = optionsSlice.reducer;
export const {clearInviteLinks} = optionsSlice.actions;

export const selectInviteLinks = (state: SliceProjection) => state.options.inviteLinks.values;
export const selectInviteLinkStatus = (state: SliceProjection) => state.options.inviteLinks.status;
export const selectAutoCollapse = (state: SliceProjection) => state.options.autoCollapse;
export const selectReminderHours = (state: SliceProjection) => state.options.reminderHours;
export const selectQuietHours = (state: SliceProjection) => state.options.quietHours;
