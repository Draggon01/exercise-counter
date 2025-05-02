import {AsyncStoreState} from "../../../commons";
import {ExerciseDto} from "../models/exerciseDto";
import {createAsyncThunk, createEntityAdapter, createSlice, EntityState, Reducer} from "@reduxjs/toolkit";

type SliceState = {
    exercises: {
        status: AsyncStoreState;
    } & EntityState<ExerciseDto, string>
}

type SliceProjection = {
    exercise: SliceState
}

const initialState: SliceState = {
    exercises: {
        status: "initial",
        ids: [],
        entities: {}
    }
}

export const listExercises = createAsyncThunk<ExerciseDto[], void, { rejectValue: any }>(
    'exercise/list', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/exercises/list", {
            method: 'GET',
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    });

export const saveExercise = createAsyncThunk<ExerciseDto, ExerciseDto, { rejectValue: any }>(
    'exercise/save', async (ex, {rejectWithValue}) => {
        console.log(ex);
        const res = await fetch("/api/exercises/save", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(ex),
            credentials: "include"
        });
        console.log("saveExercise:")
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    });

export const deleteExercise = createAsyncThunk<ExerciseDto, ExerciseDto, { rejectValue: any }>(
    'exercise/delete', async (exId, {rejectWithValue}) => {
        const res = await fetch("/api/exercises/delete", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(exId),
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    });


export const exerciseSlice = createSlice({
    name: 'user',
    initialState: initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(listExercises.pending, state => {
                state.exercises.status = 'initial';
            })
            .addCase(listExercises.rejected, state => {
                state.exercises.status = 'error';
            })
            .addCase(listExercises.fulfilled, (state, action) => {
                state.exercises.status = 'idle';
                exerciseAdapter.setAll(state.exercises, action.payload);
            })
            .addCase(saveExercise.pending, state => {
                state.exercises.status = 'initial';
            })
            .addCase(saveExercise.rejected, state => {
                state.exercises.status = 'error';
            })
            .addCase(saveExercise.fulfilled, (state, action) => {
                state.exercises.status = 'idle';
                exerciseAdapter.upsertOne(state.exercises, action.payload);
            })
            .addCase(deleteExercise.pending, state => {
                state.exercises.status = 'initial';
            })
            .addCase(deleteExercise.rejected, state => {
                state.exercises.status = 'error';
            })
            .addCase(deleteExercise.fulfilled, (state, action) => {
                state.exercises.status = 'idle';
                console.log(action.payload)
                exerciseAdapter.removeOne(state.exercises, action.payload.exerciseId);
            })
    }
});

export const exerciseAdapter = createEntityAdapter<ExerciseDto, string>({
    selectId: (exercise: ExerciseDto) => exercise.exerciseId
});

export const {
    selectAll: selectAllExercises
} = exerciseAdapter.getSelectors((state: SliceProjection) => state.exercise.exercises);

export const exerciseReducer = exerciseSlice.reducer as Reducer<SliceState>