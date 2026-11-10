import {AsyncStoreState} from "../../../commons";
import {ExerciseDto} from "../models/exerciseDto";
import {createEntityAdapter, createSlice, EntityState, Reducer} from "@reduxjs/toolkit";
import {ExerciseLogDto} from "../models/exerciseLogDto";
import {apiDelete, apiGet, apiPost, apiPut, apiThunk} from "../../../api/http";

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

/** All exercises the user may see. */
export const listExercises = apiThunk<ExerciseDto[]>(
    'exercise/list', () => apiGet("/api/exercises"));

/** The exercises on the user's home page. */
export const listExercisesSelected = apiThunk<ExerciseDto[]>(
    'exercise/list/selected', () => apiGet("/api/exercises/selected"));

/** Visible exercises not yet on the home page (browse view). */
export const listExercisesAvailable = apiThunk<ExerciseDto[]>(
    'exercise/list/available', () => apiGet("/api/exercises/available"));

/** Creates the exercise, or updates it if it has an id. */
export const saveExercise = apiThunk<ExerciseDto, ExerciseDto>(
    'exercise/save', exercise => exercise.exerciseId
        ? apiPut(`/api/exercises/${exercise.exerciseId}`, exercise)
        : apiPost("/api/exercises", exercise));

export const deleteExercise = apiThunk<ExerciseDto, ExerciseDto>(
    'exercise/delete', async exercise => {
        await apiDelete(`/api/exercises/${exercise.exerciseId}`);
        return exercise;
    });

export const selectExercise = apiThunk<string, string>(
    'selection/select', async exerciseId => {
        await apiPut(`/api/selection/${exerciseId}`);
        return exerciseId;
    });

export const unselectExercise = apiThunk<string, string>(
    'selection/unselect', async exerciseId => {
        await apiDelete(`/api/selection/${exerciseId}`);
        return exerciseId;
    });

/** Saved progress of the current period ({@code value} is null if nothing was saved). */
export const loadExerciseLog = apiThunk<ExerciseLogDto, string>(
    'exercise/log/load', exerciseId => apiGet(`/api/log/${exerciseId}`));

/** Saves the new order; returns the home page exercises in that order. */
export const reorderExercises = apiThunk<ExerciseDto[], string[]>(
    'selection/reorder', exerciseIds => apiPut("/api/selection/order", exerciseIds));

export const saveExerciseLog = apiThunk<void, ExerciseLogDto>(
    'exercise/log/save', log => apiPut(`/api/log/${log.exerciseId}`, {value: log.value}));


export const exerciseSlice = createSlice({
    name: 'exercise',
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
            .addCase(listExercisesSelected.pending, state => {
                state.exercises.status = 'initial';
            })
            .addCase(listExercisesSelected.rejected, state => {
                state.exercises.status = 'error';
            })
            .addCase(listExercisesSelected.fulfilled, (state, action) => {
                state.exercises.status = 'idle';
                exerciseAdapter.setAll(state.exercises, action.payload);
            })
            .addCase(listExercisesAvailable.pending, state => {
                state.exercises.status = 'initial';
            })
            .addCase(listExercisesAvailable.rejected, state => {
                state.exercises.status = 'error';
            })
            .addCase(listExercisesAvailable.fulfilled, (state, action) => {
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
                exerciseAdapter.removeOne(state.exercises, action.payload.exerciseId);
            })
            .addCase(selectExercise.pending, state => {
                state.exercises.status = 'initial';
            })
            .addCase(selectExercise.rejected, state => {
                state.exercises.status = 'error';
            })
            .addCase(selectExercise.fulfilled, (state, action) => {
                state.exercises.status = 'idle';
                exerciseAdapter.removeOne(state.exercises, action.payload);
            })
            .addCase(unselectExercise.pending, state => {
                state.exercises.status = 'initial';
            })
            .addCase(unselectExercise.rejected, state => {
                state.exercises.status = 'error';
            })
            .addCase(unselectExercise.fulfilled, (state, action) => {
                state.exercises.status = 'idle';
                exerciseAdapter.removeOne(state.exercises, action.payload);
            })
            .addCase(reorderExercises.pending, state => {
                state.exercises.status = 'initial';
            })
            .addCase(reorderExercises.rejected, state => {
                state.exercises.status = 'error';
            })
            .addCase(reorderExercises.fulfilled, (state, action) => {
                state.exercises.status = 'idle';
                exerciseAdapter.setAll(state.exercises, action.payload);
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