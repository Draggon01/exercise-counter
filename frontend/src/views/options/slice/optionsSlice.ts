import {AsyncStoreState} from "../../../commons";
import {createSlice, Reducer} from "@reduxjs/toolkit";
import {apiGet, apiPost, apiPut, apiThunk} from "../../../api/http";

export type PeriodDto = {
    periodId: string;
    label: string;
};

type SliceState = {
    inviteLinks: {
        status: AsyncStoreState;
        values: string[];
    }
    autoCollapse: boolean;
    optionsStatus: AsyncStoreState;
    unfinishedPeriods: PeriodDto[];
    unfinishedPeriodsStatus: AsyncStoreState;
    missedEntryStatus: AsyncStoreState;
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
    optionsStatus: "initial",
    unfinishedPeriods: [],
    unfinishedPeriodsStatus: "initial",
    missedEntryStatus: "initial"
}

export const generateInviteLink = apiThunk<string>(
    'options/generateInviteLink', () => apiPost("/api/invites", {baseUrl: window.location.origin}));

export const loadOptions = apiThunk<{ autoCollapse: boolean }>(
    'options/loadOptions', () => apiGet("/api/options"));

export const setAutoCollapse = apiThunk<boolean, boolean>(
    'options/setAutoCollapse', async autoCollapse =>
        (await apiPut<{ autoCollapse: boolean }>("/api/options", {autoCollapse})).autoCollapse);

/** Past periods of the exercise the user did not finish. */
export const loadUnfinishedPeriods = apiThunk<PeriodDto[], string>(
    'options/loadUnfinishedPeriods', exerciseId => apiGet(`/api/statistic/${exerciseId}/unfinished-periods`));

export const submitMissedEntry = apiThunk<void, { exerciseId: string; periodId: string }>(
    'options/submitMissedEntry', ({exerciseId, periodId}) =>
        apiPost(`/api/statistic/${exerciseId}/missed-entries`, {periodId}));

const optionsSlice = createSlice({
    name: 'options',
    initialState,
    reducers: {
        clearInviteLinks(state) {
            state.inviteLinks.values = [];
            state.inviteLinks.status = "initial";
        },
        clearUnfinishedPeriods(state) {
            state.unfinishedPeriods = [];
            state.unfinishedPeriodsStatus = "initial";
        }
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
            })
            .addCase(loadOptions.rejected, (state) => {
                state.optionsStatus = "error";
            })
            .addCase(setAutoCollapse.fulfilled, (state, action) => {
                state.autoCollapse = action.payload;
            })
            .addCase(loadUnfinishedPeriods.pending, (state) => {
                state.unfinishedPeriodsStatus = "loading";
            })
            .addCase(loadUnfinishedPeriods.fulfilled, (state, action) => {
                state.unfinishedPeriodsStatus = "idle";
                state.unfinishedPeriods = action.payload;
            })
            .addCase(loadUnfinishedPeriods.rejected, (state) => {
                state.unfinishedPeriodsStatus = "error";
            })
            .addCase(submitMissedEntry.pending, (state) => {
                state.missedEntryStatus = "loading";
            })
            .addCase(submitMissedEntry.fulfilled, (state) => {
                state.missedEntryStatus = "idle";
            })
            .addCase(submitMissedEntry.rejected, (state) => {
                state.missedEntryStatus = "error";
            });
    }
});

export const optionsReducer: Reducer<SliceState> = optionsSlice.reducer;
export const {clearInviteLinks, clearUnfinishedPeriods} = optionsSlice.actions;

export const selectInviteLinks = (state: SliceProjection) => state.options.inviteLinks.values;
export const selectInviteLinkStatus = (state: SliceProjection) => state.options.inviteLinks.status;
export const selectAutoCollapse = (state: SliceProjection) => state.options.autoCollapse;
export const selectUnfinishedPeriods = (state: SliceProjection) => state.options.unfinishedPeriods;
export const selectUnfinishedPeriodsStatus = (state: SliceProjection) => state.options.unfinishedPeriodsStatus;
export const selectMissedEntryStatus = (state: SliceProjection) => state.options.missedEntryStatus;
