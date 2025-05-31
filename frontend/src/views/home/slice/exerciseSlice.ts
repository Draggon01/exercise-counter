import {AsyncStoreState} from "../../../commons";
import {ExerciseDto} from "../models/exerciseDto";
import {createAsyncThunk, createEntityAdapter, createSlice, EntityState, Reducer} from "@reduxjs/toolkit";
import {CheckDto} from "../models/checkDto";

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

export const listExercisesSelected = createAsyncThunk<ExerciseDto[], void, { rejectValue: any }>(
    'exercise/list/selected', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/exercises/list/selected", {
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

export const listExercisesAvailable = createAsyncThunk<ExerciseDto[], void, { rejectValue: any }>(
    'exercise/list/available', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/exercises/list/available", {
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
        const res = await fetch("/api/exercises/save", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(ex),
            credentials: "include"
        });
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


export const selectExercise = createAsyncThunk<string, string, { rejectValue: any }>(
    'selection/select', async (exerciseId, {rejectWithValue}) => {
        const res = await fetch("/api/selection/select", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: exerciseId,
            credentials: "include"
        });
        if (res.ok) {
            return exerciseId;
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

export const unselectExercise = createAsyncThunk<string, string, { rejectValue: any }>(
    'selection/unselect', async (exerciseId, {rejectWithValue}) => {
        const res = await fetch("/api/selection/unselect", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: exerciseId,
            credentials: "include"
        });
        if (res.ok) {
            return exerciseId;
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)




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
                //TODO handle this correctly or thing how it should behave now
                //exerciseAdapter.upsertOne(state.exercises, action.payload);
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
    }
});

export const exerciseAdapter = createEntityAdapter<ExerciseDto, string>({
    selectId: (exercise: ExerciseDto) => exercise.exerciseId
});


export const {
    selectAll: selectAllExercises
} = exerciseAdapter.getSelectors((state: SliceProjection) => state.exercise.exercises);



export const exerciseReducer = exerciseSlice.reducer as Reducer<SliceState>