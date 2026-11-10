import {StatisticDto} from "../models/statisticDto";
import {createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../../commons";
import {apiGet, apiThunk} from "../../../api/http";

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


export const statisticSlice = createSlice({
    name: 'statistic',
    initialState: initialState,
    reducers: {},
    extraReducers: builder => {
        builder
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