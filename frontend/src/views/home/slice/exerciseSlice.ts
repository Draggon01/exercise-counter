import {AsyncStoreState} from "../../../commons";
import {ExerciseDto} from "../models/exerciseDto";
import {createEntityAdapter, createSlice, EntityState, PayloadAction, Reducer} from "@reduxjs/toolkit";
import {ExerciseLogDto} from "../models/exerciseLogDto";
import {logoutUser} from "../../login/slice/userSlice";
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
    /** Progress of the current period per exercise (seconds or reps done); missing until loaded. */
    progress: Record<string, number>,
    /** {@link listExerciseLogs} returned: exercises without an entry have no progress. */
    allProgressLoaded: boolean,
    /** Saves of the progress that are still running, per exercise. */
    savingProgress: Record<string, number>,
    /** Progress changed or saved since the last load started: the (older) answer must not replace it. */
    newerProgress: Record<string, boolean>,
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
    progress: {},
    allProgressLoaded: false,
    savingProgress: {},
    newerProgress: {},
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

/** Saved progress of all exercises: id → seconds or reps. */
export const listExerciseLogs = apiThunk<Record<string, number>>(
    'exercise/log/list', () => apiGet("/api/log"));

export const saveExerciseLog = apiThunk<void, ExerciseLogDto>(
    'exercise/log/save', log => apiPut(`/api/log/${log.exerciseId}`, {value: log.value}));


function saveEnded(state: SliceState, exerciseId: string) {
    state.savingProgress[exerciseId] = Math.max(0, (state.savingProgress[exerciseId] ?? 0) - 1);
}

export const exerciseSlice = createSlice({
    name: 'exercise',
    initialState: initialState,
    reducers: {
        /** What the user just did (timer, counter): shown at once, saved with {@link saveExerciseLog}. */
        progressChanged(state, action: PayloadAction<{ exerciseId: string, value: number }>) {
            state.progress[action.payload.exerciseId] = action.payload.value;
            state.newerProgress[action.payload.exerciseId] = true;
        },
    },
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
            .addCase(loadExerciseLog.pending, (state, action) => {
                state.newerProgress[action.meta.arg] = !!state.savingProgress[action.meta.arg];
            })
            .addCase(loadExerciseLog.fulfilled, (state, action) => {
                if (!state.newerProgress[action.meta.arg]) state.progress[action.meta.arg] = action.payload.value ?? 0;
            })
            .addCase(listExerciseLogs.pending, state => {
                state.newerProgress = {};
                Object.entries(state.savingProgress).forEach(([id, count]) => {
                    if (count > 0) state.newerProgress[id] = true;
                });
            })
            .addCase(listExerciseLogs.fulfilled, (state, action) => {
                const loaded: Record<string, number> = {...action.payload};
                Object.keys(state.newerProgress).filter(id => state.newerProgress[id] && id in state.progress)
                    .forEach(id => loaded[id] = state.progress[id]);
                state.progress = loaded;
                state.allProgressLoaded = true;
            })
            .addCase(listExerciseLogs.rejected, state => {
                state.allProgressLoaded = true; // the controls work anyway, starting at 0
            })
            .addCase(saveExerciseLog.pending, (state, action) => {
                const id = action.meta.arg.exerciseId;
                state.savingProgress[id] = (state.savingProgress[id] ?? 0) + 1;
                state.newerProgress[id] = true;
            })
            .addCase(saveExerciseLog.fulfilled, (state, action) => saveEnded(state, action.meta.arg.exerciseId))
            .addCase(saveExerciseLog.rejected, (state, action) => saveEnded(state, action.meta.arg.exerciseId))
            .addCase(loadExerciseLog.rejected, (state, action) => {
                state.progress[action.meta.arg] ??= 0;
            })
            .addCase(logoutUser.fulfilled, state => {
                state.progress = {};
                state.newerProgress = {};
                state.allProgressLoaded = false;
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

export const {progressChanged} = exerciseSlice.actions;

export const selectProgress = (state: SliceProjection, exerciseId: string): number | undefined =>
    state.exercise.progress[exerciseId] ?? (state.exercise.allProgressLoaded ? 0 : undefined);
export const selectExercisesStatus = (state: SliceProjection) => state.exercise.exercises.status;
export const selectAvailableExercises = (state: SliceProjection) => state.exercise.available.items;
export const selectAvailableStatus = (state: SliceProjection) => state.exercise.available.status;
export const selectVisibleExercises = (state: SliceProjection) => state.exercise.visible.items;



export const exerciseReducer = exerciseSlice.reducer as Reducer<SliceState>