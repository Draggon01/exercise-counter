import {createAsyncThunk, createSlice, PayloadAction, Reducer} from "@reduxjs/toolkit";
import {ApiError, apiDelete, apiGet, apiThunk, apiUpload, toApiError} from "../../../api/http";
import {logoutUser} from "../../login/slice/userSlice";
import {MediaConfigDto, MediaDto, MediaUsageDto} from "../models/exerciseDetailsDto";

/** An upload that is running or failed, by step. */
export interface MediaUpload {
    /** 0–1 */
    progress: number;
    /** set: it failed */
    error?: string;
}

export interface MediaState {
    /** undefined until loaded */
    config?: MediaConfigDto;
    usage?: MediaUsageDto;
    uploads: Record<string, MediaUpload>;
}

type StepArg = { exerciseId: string, stepId: string };
const mediaUrl = ({exerciseId, stepId}: StepArg) => `/api/exercises/${encodeURIComponent(exerciseId)}/steps/${stepId}/media`;

export const loadMediaConfig = apiThunk<MediaConfigDto>('media/config', () => apiGet("/api/media/config"));
export const loadMediaUsage = apiThunk<MediaUsageDto>('media/usage', () => apiGet("/api/media/usage"));
export const deleteMedia = apiThunk<void, StepArg>('media/delete', arg => apiDelete(mediaUrl(arg)));

const running = new Map<string, AbortController>();

const warnBeforeLeaving = (e: BeforeUnloadEvent) => e.preventDefault();

/** Goes on when the page is left inside the app. Errors are shown at the step. */
export const uploadMedia = createAsyncThunk<MediaDto, StepArg & { file: File }, { rejectValue: ApiError }>(
    'media/upload', async (arg, {dispatch, rejectWithValue}) => {
        const controller = new AbortController();
        running.get(arg.stepId)?.abort();
        running.set(arg.stepId, controller);
        window.addEventListener("beforeunload", warnBeforeLeaving);
        let shown = 0;
        try {
            return await apiUpload<MediaDto>(mediaUrl(arg), arg.file, {
                signal: controller.signal,
                onProgress: progress => {
                    if (progress - shown < 0.01 && progress < 1) return;
                    shown = progress;
                    dispatch(uploadProgressed({stepId: arg.stepId, progress}));
                },
            });
        } catch (e) {
            return rejectWithValue(toApiError(e));
        } finally {
            if (running.get(arg.stepId) === controller) running.delete(arg.stepId);
            if (running.size === 0) window.removeEventListener("beforeunload", warnBeforeLeaving);
        }
    });

export function cancelUpload(stepId: string) {
    running.get(stepId)?.abort();
}

const initialState: MediaState = {uploads: {}};

const mediaSlice = createSlice({
    name: 'media',
    initialState,
    reducers: {
        uploadProgressed: (state, action: PayloadAction<{ stepId: string, progress: number }>) => {
            const upload = state.uploads[action.payload.stepId];
            if (upload && !upload.error) upload.progress = action.payload.progress;
        },
        /** Removes the message of a failed upload. */
        uploadDismissed: (state, action: PayloadAction<string>) => {
            delete state.uploads[action.payload];
        },
    },
    extraReducers: builder => {
        builder
            .addCase(loadMediaConfig.fulfilled, (state, action) => {
                state.config = action.payload;
            })
            .addCase(loadMediaUsage.fulfilled, (state, action) => {
                state.usage = action.payload;
            })
            .addCase(uploadMedia.pending, (state, action) => {
                state.uploads[action.meta.arg.stepId] = {progress: 0};
            })
            .addCase(uploadMedia.fulfilled, (state, action) => {
                delete state.uploads[action.meta.arg.stepId];
            })
            .addCase(uploadMedia.rejected, (state, action) => {
                const message = action.payload?.message ?? "Something went wrong";
                if (message === "Cancelled") delete state.uploads[action.meta.arg.stepId];
                else state.uploads[action.meta.arg.stepId] = {progress: 0, error: message};
            })
            .addCase(logoutUser.fulfilled, () => initialState);
    }
});

export const {uploadProgressed, uploadDismissed} = mediaSlice.actions;
export const mediaReducer: Reducer<MediaState> = mediaSlice.reducer;
export const selectMedia = (state: { media: MediaState }) => state.media;
