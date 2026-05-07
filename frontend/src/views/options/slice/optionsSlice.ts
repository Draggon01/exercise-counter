import {AsyncStoreState} from "../../../commons";
import {createAsyncThunk, createSlice, Reducer} from "@reduxjs/toolkit";

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

export const loadUnfinishedPeriods = createAsyncThunk<PeriodDto[], string, { rejectValue: any }>(
    'options/loadUnfinishedPeriods', async (exerciseId, {rejectWithValue}) => {
        const res = await fetch(`/api/statistic/unfinished-periods/${exerciseId}`, {
            credentials: "include"
        });
        if (res.ok) {
            return await res.json();
        } else {
            return rejectWithValue("Failed to load unfinished periods");
        }
    });

export const submitMissedEntry = createAsyncThunk<void, { exerciseId: string; periodId: string }, { rejectValue: any }>(
    'options/submitMissedEntry', async ({exerciseId, periodId}, {rejectWithValue}) => {
        const res = await fetch("/api/statistic/add-missed-entry", {
            method: 'POST',
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({exerciseId, periodId}),
            credentials: "include"
        });
        if (!res.ok) {
            return rejectWithValue("Failed to submit missed entry");
        }
    });

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
