import {describe, expect, it} from "vitest";
import {
    deleteExercise,
    exerciseReducer,
    listExercisesAvailable,
    listExerciseLogs,
    listExercisesSelected,
    loadExerciseLog,
    progressChanged,
    saveExercise,
    saveExerciseLog,
    selectExercise,
    selectProgress,
} from "./exerciseSlice";
import {ExerciseDto} from "../models/exerciseDto";

const ex = (id: string) => ({exerciseId: id, exerciseTitle: id} as ExerciseDto);
const init = () => exerciseReducer(undefined, {type: "init"});

describe("exerciseSlice", () => {
    it("home and browse lists are stored separately", () => {
        let state = exerciseReducer(init(), listExercisesSelected.fulfilled([ex("home")], "r1"));
        state = exerciseReducer(state, listExercisesAvailable.fulfilled([ex("browse")], "r2"));

        expect(state.exercises.ids).toEqual(["home"]);
        expect(state.available.items.map(e => e.exerciseId)).toEqual(["browse"]);
    });

    it("tracks the loading status of a list", () => {
        let state = exerciseReducer(init(), listExercisesSelected.pending("r1"));
        expect(state.exercises.status).toBe("loading");

        state = exerciseReducer(state, listExercisesSelected.rejected(null, "r1", undefined, {status: 500, message: "x"}));
        expect(state.exercises.status).toBe("error");
    });

    it("mutations do not change the list status (no flicker, errors are toasts)", () => {
        let state = exerciseReducer(init(), listExercisesSelected.fulfilled([ex("a")], "r1"));

        state = exerciseReducer(state, saveExercise.pending("r2", ex("a")));
        state = exerciseReducer(state, deleteExercise.rejected(null, "r3", ex("a"), {status: 403, message: "no"}));

        expect(state.exercises.status).toBe("idle");
        expect(state.exercises.ids).toEqual(["a"]);
    });

    it("keeps the progress per exercise", () => {
        let state = exerciseReducer(init(), loadExerciseLog.fulfilled({exerciseId: "a", value: 30}, "r1", "a"));
        state = exerciseReducer(state, loadExerciseLog.fulfilled({exerciseId: "b", value: null}, "r2", "b"));
        expect(state.progress).toEqual({a: 30, b: 0});

        state = exerciseReducer(state, progressChanged({exerciseId: "a", value: 45}));
        expect(state.progress.a).toBe(45);
    });

    it("a load that started before the last save does not bring back old progress", () => {
        const log = {exerciseId: "a", value: 20};
        let state = exerciseReducer(init(), saveExerciseLog.pending("s", log)); // still running …
        state = exerciseReducer(state, progressChanged(log));
        state = exerciseReducer(state, listExerciseLogs.pending("l"));          // … when the load starts
        state = exerciseReducer(state, saveExerciseLog.fulfilled(undefined, "s", log));
        state = exerciseReducer(state, listExerciseLogs.fulfilled({a: 5, b: 7}, "l"));
        expect(state.progress).toEqual({a: 20, b: 7});

        // the next load is newer than everything
        state = exerciseReducer(state, listExerciseLogs.pending("l2"));
        state = exerciseReducer(state, listExerciseLogs.fulfilled({b: 8}, "l2"));
        expect(state.progress).toEqual({b: 8});
        expect(selectProgress({exercise: state}, "a")).toBe(0);
    });

    it("selecting removes the exercise from the browse list", () => {
        let state = exerciseReducer(init(), listExercisesAvailable.fulfilled([ex("a"), ex("b")], "r1"));

        state = exerciseReducer(state, selectExercise.fulfilled("a", "r2", "a"));

        expect(state.available.items.map(e => e.exerciseId)).toEqual(["b"]);
    });
});
