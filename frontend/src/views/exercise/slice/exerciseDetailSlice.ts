import {createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../../commons";
import {apiDelete, apiGet, apiPost, apiPut, apiThunk} from "../../../api/http";
import {ExerciseDto} from "../../home/models/exerciseDto";
import {ExerciseDetailsDto, ExerciseStepDto, ExerciseStepRequest, GuidedMode} from "../models/exerciseDetailsDto";
import {saveExercise} from "../../home/slice/exerciseSlice";
import {logoutUser} from "../../login/slice/userSlice";

export type ExerciseDetailState = {
    /** exercise the state belongs to */
    exerciseId: string;
    status: AsyncStoreState;
    /** unknown, deleted, or not shared with the user */
    notFound: boolean;
    exercise?: ExerciseDto;
    /** description and steps; undefined until loaded */
    details?: ExerciseDetailsDto;
    detailsFailed: boolean;
    /** the user's own note; undefined until loaded */
    note?: string;
};

type SliceProjection = { exerciseDetail: ExerciseDetailState };

const initialState: ExerciseDetailState = {exerciseId: "", status: "initial", notFound: false, detailsFailed: false};

/** The exercise of the exercise page (does not have to be on the home list). Failures are shown on the page. */
export const loadExercise = apiThunk<ExerciseDto, string>(
    'exerciseDetail/load', exerciseId => apiGet(`/api/exercises/${encodeURIComponent(exerciseId)}`));

const detailsUrl = (exerciseId: string) => `/api/exercises/${encodeURIComponent(exerciseId)}`;

/** Steps an exercise can have (the backend enforces it). */
export const MAX_STEPS = 12;

export const loadDetails = apiThunk<ExerciseDetailsDto, string>(
    'exerciseDetail/loadDetails', exerciseId => apiGet(`${detailsUrl(exerciseId)}/details`));

export const saveDescription = apiThunk<ExerciseDetailsDto, { exerciseId: string, description: string }>(
    'exerciseDetail/saveDescription', ({exerciseId, description}) =>
        apiPut(`${detailsUrl(exerciseId)}/details`, {description}));

export const saveGuidedMode = apiThunk<ExerciseDetailsDto, { exerciseId: string, guidedMode: GuidedMode }>(
    'exerciseDetail/saveGuidedMode', ({exerciseId, guidedMode}) =>
        apiPut(`${detailsUrl(exerciseId)}/details`, {guidedMode}));

export const addStep = apiThunk<ExerciseStepDto, { exerciseId: string, step: ExerciseStepRequest }>(
    'exerciseDetail/addStep', ({exerciseId, step}) => apiPost(`${detailsUrl(exerciseId)}/steps`, step));

export const updateStep = apiThunk<ExerciseStepDto, { exerciseId: string, stepId: string, step: ExerciseStepRequest }>(
    'exerciseDetail/updateStep', ({exerciseId, stepId, step}) =>
        apiPut(`${detailsUrl(exerciseId)}/steps/${stepId}`, step));

export const deleteStep = apiThunk<void, { exerciseId: string, stepId: string }>(
    'exerciseDetail/deleteStep', ({exerciseId, stepId}) => apiDelete(`${detailsUrl(exerciseId)}/steps/${stepId}`));

/** The ids of all steps in their new order. */
export const reorderSteps = apiThunk<ExerciseDetailsDto, { exerciseId: string, stepIds: string[] }>(
    'exerciseDetail/reorderSteps', ({exerciseId, stepIds}) =>
        apiPut(`${detailsUrl(exerciseId)}/steps/order`, stepIds));

/** The user's own note (empty if none). */
export const loadNote = apiThunk<{ text: string }, string>(
    'exerciseDetail/loadNote', exerciseId => apiGet(`${detailsUrl(exerciseId)}/note`));

/** An empty text deletes the note. */
export const saveNote = apiThunk<{ text: string }, { exerciseId: string, text: string }>(
    'exerciseDetail/saveNote', ({exerciseId, text}) => apiPut(`${detailsUrl(exerciseId)}/note`, {text}));

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
                    : {exerciseId: action.meta.arg, status: "loading", notFound: false, detailsFailed: false};
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
            .addCase(loadDetails.pending, (state, action) => {
                if (state.exerciseId === action.meta.arg) state.detailsFailed = false;
            })
            .addCase(loadDetails.fulfilled, (state, action) => {
                if (state.exerciseId === action.meta.arg) state.details = action.payload;
            })
            .addCase(loadDetails.rejected, (state, action) => {
                if (state.exerciseId === action.meta.arg) state.detailsFailed = true;
            })
            .addCase(saveDescription.fulfilled, (state, action) => {
                // only the description: a step may have been changed at the same time
                if (state.exerciseId === action.meta.arg.exerciseId && state.details) {
                    state.details.description = action.payload.description;
                }
            })
            .addCase(saveGuidedMode.fulfilled, (state, action) => {
                if (state.exerciseId === action.meta.arg.exerciseId && state.details) {
                    state.details.guidedMode = action.payload.guidedMode;
                }
            })
            .addCase(addStep.fulfilled, (state, action) => {
                if (state.exerciseId === action.meta.arg.exerciseId) state.details?.steps.push(action.payload);
            })
            .addCase(updateStep.fulfilled, (state, action) => {
                if (state.exerciseId !== action.meta.arg.exerciseId || !state.details) return;
                state.details.steps = state.details.steps.map(step =>
                    step.stepId === action.payload.stepId ? action.payload : step);
            })
            .addCase(deleteStep.fulfilled, (state, action) => {
                if (state.exerciseId !== action.meta.arg.exerciseId || !state.details) return;
                state.details.steps = state.details.steps.filter(step => step.stepId !== action.meta.arg.stepId);
            })
            .addCase(reorderSteps.fulfilled, (state, action) => {
                if (state.exerciseId === action.meta.arg.exerciseId) state.details = action.payload;
            })
            .addCase(loadNote.fulfilled, (state, action) => {
                if (state.exerciseId === action.meta.arg) state.note = action.payload.text;
            })
            .addCase(saveNote.fulfilled, (state, action) => {
                if (state.exerciseId === action.meta.arg.exerciseId) state.note = action.payload.text;
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
