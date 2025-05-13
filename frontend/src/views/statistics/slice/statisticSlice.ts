import {StatisticDto} from "../models/statisticDto";
import {createAsyncThunk, createSlice, Reducer} from "@reduxjs/toolkit";
import {checkAdapter, listUserChecks} from "../../home/slice/checkSlice";
import {AsyncStoreState} from "../../../commons";

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

export const loadStatistic = createAsyncThunk<StatisticDto, string, { rejectValue: any }>(
    'statistic/load', async (exerciseId, {rejectWithValue}) => {
        const res = await fetch(`/api/statistic/load?exerciseId=${exerciseId}`, {
            method: 'GET',
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)


export const statisticSlice = createSlice({
    name: 'statistic',
    initialState: initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(loadStatistic.pending, state => {
                state.statisticStatus = 'initial';
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
export const statisticReducer = statisticSlice.reducer as Reducer<SliceState>