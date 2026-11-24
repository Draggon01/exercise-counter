import {describe, expect, it} from "vitest";
import {addStep, deleteStep, exerciseDetailReducer, loadDetails, loadExercise, loadNote, saveGuidedMode, saveNote, selectExerciseDetail, updateStep} from "./exerciseDetailSlice";
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

    it("keeps the steps up to date, only of the exercise that is shown", () => {
        const step = (id: string, title = id) =>
            ({stepId: id, title, hints: "", sets: null, reps: null, durationSeconds: null, restSeconds: null});
        const arg = {exerciseId: "a", stepId: "1", step: step("1")};
        const details = {description: "", guidedMode: "OFF" as const, steps: [step("1")]};
        let state = exerciseDetailReducer(loaded, loadDetails.fulfilled(details, "r", "a"));
        state = exerciseDetailReducer(state, addStep.fulfilled(step("2"), "r", arg));
        state = exerciseDetailReducer(state, updateStep.fulfilled(step("1", "new"), "r", arg));
        state = exerciseDetailReducer(state, addStep.fulfilled(step("9"), "r", {...arg, exerciseId: "other"}));
        expect(state.details?.steps.map(s => s.title)).toEqual(["new", "2"]);

        state = exerciseDetailReducer(state, deleteStep.fulfilled(undefined, "r", arg));
        expect(state.details?.steps.map(s => s.title)).toEqual(["2"]);

        // another exercise starts without details
        expect(exerciseDetailReducer(state, loadExercise.pending("r", "b")).details).toBeUndefined();
    });

    it("takes over only the guided mode when that is saved", () => {
        const details = {description: "old", guidedMode: "OFF" as const, steps: []};
        let state = exerciseDetailReducer(loaded, loadDetails.fulfilled(details, "r", "a"));
        const saved = {description: "other", guidedMode: "SHUFFLED" as const, steps: []};
        state = exerciseDetailReducer(state, saveGuidedMode.fulfilled(saved, "r", {exerciseId: "a", guidedMode: "SHUFFLED"}));
        expect(state.details).toEqual({...details, guidedMode: "SHUFFLED"});
    });

    it("keeps the own note of the exercise that is shown", () => {
        let state = exerciseDetailReducer(loaded, loadNote.fulfilled({text: "mine"}, "r", "a"));
        state = exerciseDetailReducer(state, loadNote.fulfilled({text: "other"}, "r", "b"));
        expect(state.note).toBe("mine");
        state = exerciseDetailReducer(state, saveNote.fulfilled({text: ""}, "r", {exerciseId: "a", text: ""}));
        expect(state.note).toBe("");
        expect(exerciseDetailReducer(state, loadExercise.pending("r", "b")).note).toBeUndefined();
    });

    it("takes over saved changes", () => {
        const state = exerciseDetailReducer(loaded, saveExercise.fulfilled(ex("a", "new"), "r2", ex("a")));
        expect(state.exercise?.exerciseTitle).toBe("new");
    });
});
