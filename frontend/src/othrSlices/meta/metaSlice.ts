import {createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../commons";
import {apiGet, apiThunk} from "../../api/http";

/**
 * Static lists from the backend: exercise types (key → description) and visibility options.
 */
type SliceState = {
    status: AsyncStoreState;
    exerciseTypes: Record<string, string>;
    visibilities: string[];
}

type SliceProjection = {
    meta: SliceState
}

const initialState: SliceState = {
    status: "initial",
    exerciseTypes: {},
    visibilities: []
}

export const loadExerciseMeta = apiThunk<{ exerciseTypes: Record<string, string>, visibilities: string[] }>(
    'meta/loadExercise', async () => {
        const [exerciseTypes, visibilities] = await Promise.all([
            apiGet<Record<string, string>>("/api/exercises/exercisetype"),
            apiGet<string[]>("/api/exercises/visibility"),
        ]);
        return {exerciseTypes, visibilities};
    });

const metaSlice = createSlice({
    name: 'meta',
    initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(loadExerciseMeta.pending, state => {
                state.status = "loading";
            })
            .addCase(loadExerciseMeta.rejected, state => {
                state.status = "error";
            })
            .addCase(loadExerciseMeta.fulfilled, (state, action) => {
                state.status = "idle";
                state.exerciseTypes = action.payload.exerciseTypes;
                state.visibilities = action.payload.visibilities;
            });
    }
});

export const metaReducer: Reducer<SliceState> = metaSlice.reducer;
export const selectExerciseTypes = (state: SliceProjection) => state.meta.exerciseTypes;
export const selectVisibilities = (state: SliceProjection) => state.meta.visibilities;
