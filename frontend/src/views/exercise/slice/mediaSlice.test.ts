import {describe, expect, it} from "vitest";
import {ExerciseDto} from "../../home/models/exerciseDto";
import {ExerciseDetailsDto, MediaDto} from "../models/exerciseDetailsDto";
import {exerciseDetailReducer, loadDetails, loadExercise, refreshMedia} from "./exerciseDetailSlice";
import {deleteMedia, mediaReducer, uploadMedia, uploadProgressed} from "./mediaSlice";

const media = (mediaId: string, status: MediaDto["status"]): MediaDto =>
    ({mediaId, kind: "VIDEO", status, error: null, durationMs: null, width: null, height: null, hasAudio: false});
const details = (m: MediaDto | null, title = "a"): ExerciseDetailsDto => ({
    description: "", guidedMode: "OFF",
    steps: [{stepId: "s", title, hints: "", sets: null, reps: null, durationSeconds: null, restSeconds: null, media: m}],
});
const arg = {exerciseId: "e", stepId: "s", file: {} as File};
const loaded = [loadExercise.pending("r", "e"), loadExercise.fulfilled({exerciseId: "e"} as ExerciseDto, "r", "e"),
    loadDetails.fulfilled(details(null), "r", "e")].reduce(exerciseDetailReducer, undefined as never as ReturnType<typeof exerciseDetailReducer>);
const mediaOf = (state: typeof loaded) => state.details?.steps[0].media;

describe("media of steps", () => {
    it("shows uploads, what became of them and deletions", () => {
        let state = exerciseDetailReducer(loaded, uploadMedia.fulfilled(media("m", "PROCESSING"), "r", arg));
        expect(mediaOf(state)?.status).toBe("PROCESSING");
        state = exerciseDetailReducer(state, refreshMedia.pending("r2", "e"));
        state = exerciseDetailReducer(state, refreshMedia.fulfilled(details(media("m", "READY"), "changed elsewhere"), "r2", "e"));
        expect(mediaOf(state)?.status).toBe("READY");
        expect(state.details?.steps[0].title).toBe("a"); // only the media
        state = exerciseDetailReducer(state, deleteMedia.fulfilled(undefined, "r", arg));
        expect(mediaOf(state)).toBeNull();
    });

    it("ignores a refresh that started before an upload was finished", () => {
        let state = exerciseDetailReducer(loaded, refreshMedia.pending("r", "e"));
        state = exerciseDetailReducer(state, uploadMedia.fulfilled(media("m", "PROCESSING"), "r", arg));
        state = exerciseDetailReducer(state, refreshMedia.fulfilled(details(null), "r", "e"));
        expect(mediaOf(state)?.mediaId).toBe("m");
    });

    it("keeps progress and error of an upload", () => {
        let state = mediaReducer(undefined, uploadMedia.pending("r", arg));
        state = mediaReducer(state, uploadProgressed({stepId: "s", progress: 0.4}));
        expect(state.uploads.s).toEqual({progress: 0.4});
        const failed = mediaReducer(state, uploadMedia.rejected(null, "r", arg, {status: 413, message: "too large"}));
        expect(failed.uploads.s.error).toBe("too large");
        expect(mediaReducer(state, uploadMedia.rejected(null, "r", arg, {status: 0, message: "Cancelled"})).uploads).toEqual({});
        expect(mediaReducer(state, uploadMedia.fulfilled(media("m", "PROCESSING"), "r", arg)).uploads).toEqual({});
    });
});
