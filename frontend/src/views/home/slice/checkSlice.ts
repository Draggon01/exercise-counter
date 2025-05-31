import {AsyncStoreState} from "../../../commons";
import {createAsyncThunk, createEntityAdapter, createSlice, EntityState, Reducer} from "@reduxjs/toolkit";
import {CheckDto} from "../models/checkDto";

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

export const listUserChecks = createAsyncThunk<CheckDto[], void, { rejectValue: any }>(
    'checks/list', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/check/list", {
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

export const listChecksPerExercise = createAsyncThunk<Record<string, CheckDto[]>, void, { rejectValue: any }>(
    'checks/listPerExercise', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/check/list/per/exercise", {
            method: 'GET',
            credentials: "include"
        });
        if (res.ok) {
            return await res.json();
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

export const saveCheck = createAsyncThunk<CheckDto, CheckDto, { rejectValue: any }>(
    'checks/save', async (ck, {rejectWithValue}) => {
        const res = await fetch("/api/check/save", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(ck),
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

export const deleteCheck = createAsyncThunk<CheckDto, CheckDto, { rejectValue: any }>(
    'checks/delete', async (ck, {rejectWithValue}) => {
        const res = await fetch("/api/check/delete", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(ck),
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
            .addCase(saveCheck.pending, state => {
                state.checks.status = 'initial';
            })
            .addCase(saveCheck.rejected, state => {
                state.checks.status = 'error';
            })
            .addCase(saveCheck.fulfilled, (state, action) => {
                state.checks.status = 'idle';
                checkAdapter.upsertOne(state.checks, action.payload);
            })
            .addCase(deleteCheck.pending, state => {
                state.checks.status = 'initial';
            })
            .addCase(deleteCheck.rejected, state => {
                state.checks.status = 'error';
            })
            .addCase(deleteCheck.fulfilled, (state, action) => {
                state.checks.status = 'idle';
                checkAdapter.removeOne(state.checks, action.payload.exerciseId);
            })
            .addCase(listChecksPerExercise.pending, state => {
                state.checks.status = 'initial';
            })
            .addCase(listChecksPerExercise.rejected, state => {
                state.checks.status = 'error';
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