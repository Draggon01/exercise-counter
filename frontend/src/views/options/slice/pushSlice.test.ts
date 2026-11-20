import {describe, expect, it} from "vitest";
import {loadReminders, pushReducer, setExerciseReminder} from "./pushSlice";
import {unselectExercise} from "../../home/slice/exerciseSlice";

const initial = pushReducer(undefined, {type: "init"});

describe("push slice reminders", () => {
    it("stores the loaded reminders", () => {
        const state = pushReducer(initial, loadReminders.fulfilled(["a", "b"], "req"));
        expect(state.reminders).toEqual(["a", "b"]);
        expect(state.remindersLoaded).toBe(true);
    });

    it("turns a reminder on and off only once it is saved", () => {
        const change = {exerciseId: "a", on: true};
        let state = pushReducer(initial, setExerciseReminder.pending("req", change));
        expect(state.reminders).toEqual([]);
        state = pushReducer(state, setExerciseReminder.fulfilled(change, "req", change));
        state = pushReducer(state, setExerciseReminder.fulfilled(change, "req", change));
        expect(state.reminders).toEqual(["a"]);
        const off = {exerciseId: "a", on: false};
        state = pushReducer(state, setExerciseReminder.fulfilled(off, "req", off));
        expect(state.reminders).toEqual([]);
    });

    it("hiding an exercise removes its reminder", () => {
        let state = pushReducer(initial, loadReminders.fulfilled(["a", "b"], "req"));
        state = pushReducer(state, unselectExercise.fulfilled("a", "req", "a"));
        expect(state.reminders).toEqual(["b"]);
    });
});
