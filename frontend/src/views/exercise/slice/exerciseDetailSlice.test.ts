import {describe, expect, it} from "vitest";
import {exerciseDetailReducer, loadExercise, selectExerciseDetail} from "./exerciseDetailSlice";
import {ExerciseDto} from "../../home/models/exerciseDto";
import {saveExercise} from "../../home/slice/exerciseSlice";

const ex = (id: string, title = id) => ({exerciseId: id, exerciseTitle: title} as ExerciseDto);
const initial = exerciseDetailReducer(undefined, {type: "init"});
const loaded = exerciseDetailReducer(
    exerciseDetailReducer(initial, loadExercise.pending("r", "a")), loadExercise.fulfilled(ex("a"), "r", "a"));

describe("exerciseDetail slice", () => {
    it("keeps showing the exercise while it is loaded again or that fails", () => {
        let state = exerciseDetailReducer(loaded, loadExercise.pending("r2", "a"));
        expect(state).toMatchObject({status: "loading", exercise: ex("a")});
        state = exerciseDetailReducer(state, loadExercise.rejected(null, "r2", "a", {status: 0, message: "offline"}));
        expect(state).toMatchObject({status: "error", notFound: false, exercise: ex("a")});
    });

    it("another exercise starts empty and late answers of the first are ignored", () => {
        let state = exerciseDetailReducer(loaded, loadExercise.pending("r2", "b"));
        expect(state.exercise).toBeUndefined();
        state = exerciseDetailReducer(state, loadExercise.fulfilled(ex("a"), "r3", "a"));
        expect(state.exercise).toBeUndefined();
        expect(selectExerciseDetail({exerciseDetail: state}, "a").status).toBe("initial");
    });

    it("404: not found, the exercise is gone", () => {
        const state = exerciseDetailReducer(loaded, loadExercise.rejected(null, "r2", "a", {status: 404, message: "x"}));
        expect(state).toMatchObject({notFound: true, exercise: undefined});
    });

    it("takes over saved changes", () => {
        const state = exerciseDetailReducer(loaded, saveExercise.fulfilled(ex("a", "new"), "r2", ex("a")));
        expect(state.exercise?.exerciseTitle).toBe("new");
    });
});
