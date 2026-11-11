import {StatisticDto} from "../models/statisticDto";
import {createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../../commons";
import {apiGet, apiPost, apiThunk} from "../../../api/http";

type SliceState = {
    statisticStatus: AsyncStoreState;
    statistic: StatisticDto;
}

type SliceProjection = {
    statistic: SliceState
}

const initialState: SliceState = {
    statisticStatus: "initial",
    statistic: {} as StatisticDto,
}

export const loadStatistic = apiThunk<StatisticDto, string>(
    'statistic/load', exerciseId => apiGet(`/api/statistic/${exerciseId}`));

type MissedEntry = { exerciseId: string, date: string, username: string };

/** Marks one of the last periods (closing day YYYY-MM-DD) as done by the user ("forgot to tap Done"). */
export const addMissedEntry = apiThunk<MissedEntry, MissedEntry>(
    'statistic/addMissedEntry', async entry => {
        await apiPost(`/api/statistic/${entry.exerciseId}/missed-entries`, {date: entry.date});
        return entry;
    });


export const statisticSlice = createSlice({
    name: 'statistic',
    initialState: initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(addMissedEntry.fulfilled, (state, action) => {
                // same key format as the backend: "<closing day>:<closing day>"
                const key = `${action.payload.date}:${action.payload.date}`;
                const finishers = state.statistic.finishedInformation?.[key];
                if (finishers && !finishers.includes(action.payload.username)) {
                    finishers.push(action.payload.username);
                }
            })
            .addCase(loadStatistic.pending, state => {
                state.statisticStatus = 'loading';
                // never show the previous exercise's numbers while the next one loads
                state.statistic = {finishedInformation: {}};
            })
            .addCase(loadStatistic.rejected, state => {
                state.statisticStatus = 'error';
            })
            .addCase(loadStatistic.fulfilled, (state, action) => {
                state.statisticStatus = 'idle';
                state.statistic = action.payload;
            })
    }
});

export const selectStatistic = ((state: SliceProjection) => state.statistic.statistic)
export const selectStatisticStatus = ((state: SliceProjection) => state.statistic.statisticStatus)
export const statisticReducer = statisticSlice.reducer as Reducer<SliceState>