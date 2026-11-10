import {AsyncStoreState} from "../../../commons";
import {ExerciseDto} from "../models/exerciseDto";
import {createEntityAdapter, createSlice, EntityState, Reducer} from "@reduxjs/toolkit";
import {ExerciseLogDto} from "../models/exerciseLogDto";
import {apiDelete, apiGet, apiPost, apiPut, apiThunk} from "../../../api/http";

type ExerciseList = {
    status: AsyncStoreState;
    items: ExerciseDto[];
}

type SliceState = {
    /** The exercises on the user's home page. */
    exercises: {
        status: AsyncStoreState;
    } & EntityState<ExerciseDto, string>,
    /** Browse: visible exercises not on the home page yet. */
    available: ExerciseList,
    /** All exercises the user may see (options: missed entries). */
    visible: ExerciseList,
}

type SliceProjection = {
    exercise: SliceState
}

const initialState: SliceState = {
    exercises: {
        status: "initial",
        ids: [],
        entities: {}
    },
    available: {status: "initial", items: []},
    visible: {status: "initial", items: []},
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
    // list loads track their status; mutations only change data on success (their errors are shown as toasts)
    extraReducers: builder => {
        builder
            .addCase(listExercisesSelected.pending, state => {
                state.exercises.status = 'loading';
            })
            .addCase(listExercisesSelected.rejected, state => {
                state.exercises.status = 'error';
            })
            .addCase(listExercisesSelected.fulfilled, (state, action) => {
                state.exercises.status = 'idle';
                exerciseAdapter.setAll(state.exercises, action.payload);
            })
            .addCase(listExercisesAvailable.pending, state => {
                state.available.status = 'loading';
            })
            .addCase(listExercisesAvailable.rejected, state => {
                state.available.status = 'error';
            })
            .addCase(listExercisesAvailable.fulfilled, (state, action) => {
                state.available = {status: 'idle', items: action.payload};
            })
            .addCase(listExercises.pending, state => {
                state.visible.status = 'loading';
            })
            .addCase(listExercises.rejected, state => {
                state.visible.status = 'error';
            })
            .addCase(listExercises.fulfilled, (state, action) => {
                state.visible = {status: 'idle', items: action.payload};
            })
            .addCase(saveExercise.fulfilled, (state, action) => {
                exerciseAdapter.upsertOne(state.exercises, action.payload);
            })
            .addCase(deleteExercise.fulfilled, (state, action) => {
                exerciseAdapter.removeOne(state.exercises, action.payload.exerciseId);
            })
            .addCase(selectExercise.fulfilled, (state, action) => {
                state.available.items = state.available.items.filter(e => e.exerciseId !== action.payload);
            })
            .addCase(unselectExercise.fulfilled, (state, action) => {
                exerciseAdapter.removeOne(state.exercises, action.payload);
            })
            .addCase(reorderExercises.fulfilled, (state, action) => {
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

export const selectExercisesStatus = (state: SliceProjection) => state.exercise.exercises.status;
export const selectAvailableExercises = (state: SliceProjection) => state.exercise.available.items;
export const selectAvailableStatus = (state: SliceProjection) => state.exercise.available.status;
export const selectVisibleExercises = (state: SliceProjection) => state.exercise.visible.items;



export const exerciseReducer = exerciseSlice.reducer as Reducer<SliceState>