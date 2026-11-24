import {createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../../commons";
import {apiGet, apiThunk} from "../../../api/http";
import {ExerciseDto} from "../../home/models/exerciseDto";
import {saveExercise} from "../../home/slice/exerciseSlice";
import {logoutUser} from "../../login/slice/userSlice";

export type ExerciseDetailState = {
    /** exercise the state belongs to */
    exerciseId: string;
    status: AsyncStoreState;
    /** unknown, deleted, or not shared with the user */
    notFound: boolean;
    exercise?: ExerciseDto;
};

type SliceProjection = { exerciseDetail: ExerciseDetailState };

const initialState: ExerciseDetailState = {exerciseId: "", status: "initial", notFound: false};

/** The exercise of the exercise page (does not have to be on the home list). Failures are shown on the page. */
export const loadExercise = apiThunk<ExerciseDto, string>(
    'exerciseDetail/load', exerciseId => apiGet(`/api/exercises/${encodeURIComponent(exerciseId)}`));

const exerciseDetailSlice = createSlice({
    name: 'exerciseDetail',
    initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(loadExercise.pending, (state, action) => {
                // loading the same exercise again keeps showing it; another one starts empty
                return state.exerciseId === action.meta.arg
                    ? {...state, status: "loading"}
                    : {exerciseId: action.meta.arg, status: "loading", notFound: false};
            })
            .addCase(loadExercise.fulfilled, (state, action) => {
                if (state.exerciseId !== action.meta.arg) return; // answer for a page that was left
                state.status = "idle";
                state.notFound = false;
                state.exercise = action.payload;
            })
            .addCase(loadExercise.rejected, (state, action) => {
                if (state.exerciseId !== action.meta.arg) return;
                state.status = "error";
                state.notFound = action.payload?.status === 404 || action.payload?.status === 400;
                if (state.notFound) state.exercise = undefined;
            })
            .addCase(saveExercise.fulfilled, (state, action) => {
                if (state.exerciseId === action.payload.exerciseId) state.exercise = action.payload;
            })
            .addCase(logoutUser.fulfilled, () => initialState);
    }
});

export const exerciseDetailReducer: Reducer<ExerciseDetailState> = exerciseDetailSlice.reducer;

/** State of the given exercise; "initial" while another one (or none) is loaded. */
export const selectExerciseDetail = (state: SliceProjection, exerciseId: string): ExerciseDetailState =>
    state.exerciseDetail.exerciseId === exerciseId ? state.exerciseDetail : initialState;
