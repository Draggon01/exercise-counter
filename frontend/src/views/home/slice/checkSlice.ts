import {AsyncStoreState} from "../../../commons";
import {createEntityAdapter, createSlice, EntityState, Reducer} from "@reduxjs/toolkit";
import {CheckDto} from "../models/checkDto";
import {apiDelete, apiGet, apiPut, apiThunk} from "../../../api/http";

type SliceState = {
    checks: {
        status: AsyncStoreState;
    } & EntityState<CheckDto, string>,
    checksPerExercise: {
        status: AsyncStoreState;
        data: Record<string, CheckDto[]>
    }
}

type SliceProjection = {
    checks: SliceState
}

const initialState: SliceState = {
    checks: {
        status: "initial",
        ids: [],
        entities: {}
    },
    checksPerExercise: {
        status: "initial",
        data: {}
    }
}

export const listUserChecks = apiThunk<CheckDto[]>(
    'checks/list', () => apiGet("/api/checks"));

export const listChecksPerExercise = apiThunk<Record<string, CheckDto[]>>(
    'checks/listPerExercise', () => apiGet("/api/checks/per-exercise"));

export const saveCheck = apiThunk<CheckDto, CheckDto>(
    'checks/save', check => apiPut(`/api/checks/${check.exerciseId}`));

export const deleteCheck = apiThunk<CheckDto, CheckDto>(
    'checks/delete', async check => {
        await apiDelete(`/api/checks/${check.exerciseId}`);
        return check;
    });


export const checkSlice = createSlice({
    name: 'check',
    initialState: initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(listUserChecks.pending, state => {
                state.checks.status = 'initial';
            })
            .addCase(listUserChecks.rejected, state => {
                state.checks.status = 'error';
            })
            .addCase(listUserChecks.fulfilled, (state, action) => {
                state.checks.status = 'idle';
                checkAdapter.setAll(state.checks, action.payload);
            })
            // mutations only change the data on success (the list status is for loading the list)
            .addCase(saveCheck.fulfilled, (state, action) => {
                checkAdapter.upsertOne(state.checks, action.payload);
            })
            .addCase(deleteCheck.fulfilled, (state, action) => {
                checkAdapter.removeOne(state.checks, action.payload.exerciseId);
            })
            .addCase(listChecksPerExercise.pending, state => {
                state.checksPerExercise.status = 'initial';
            })
            .addCase(listChecksPerExercise.rejected, state => {
                state.checksPerExercise.status = 'error';
            })
            .addCase(listChecksPerExercise.fulfilled, (state, action) => {
                state.checksPerExercise.status = 'idle';
                state.checksPerExercise.data = action.payload;
            })
    }
});

export const selectChecksPerExercise = (state: SliceProjection) => state.checks.checksPerExercise.data;

export const checkAdapter = createEntityAdapter<CheckDto, string>({
    selectId: (check: CheckDto) => check.exerciseId
})

export const {
    selectAll: selectAllChecks
} = checkAdapter.getSelectors((state: SliceProjection) => state.checks.checks);

export const checkReducer = checkSlice.reducer as Reducer<SliceState>