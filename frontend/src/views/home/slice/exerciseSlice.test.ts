import {describe, expect, it} from "vitest";
import {
    deleteExercise,
    exerciseReducer,
    listExercisesAvailable,
    listExercisesSelected,
    saveExercise,
    selectExercise,
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

    it("selecting removes the exercise from the browse list", () => {
        let state = exerciseReducer(init(), listExercisesAvailable.fulfilled([ex("a"), ex("b")], "r1"));

        state = exerciseReducer(state, selectExercise.fulfilled("a", "r2", "a"));

        expect(state.available.items.map(e => e.exerciseId)).toEqual(["b"]);
    });
});
