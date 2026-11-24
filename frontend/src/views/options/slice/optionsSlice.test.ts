import {describe, expect, it} from "vitest";
import {loadOptions, optionsReducer, selectNewExerciseView, selectOptionsReady, setNewExerciseView} from "./optionsSlice";
import {logoutUser} from "../../login/slice/userSlice";

const initial = optionsReducer(undefined, {type: "init"});
const loaded = {
    autoCollapse: true, reminderHours: 3, quietHours: false, quietFrom: 22, quietUntil: 7, timeZone: null,
    newExerciseView: true
};
const view = (options: typeof initial) => ({
    on: selectNewExerciseView({options}), ready: selectOptionsReady({options})
});

describe("options slice: new exercise view", () => {
    it("is off and not ready before the options are loaded", () => {
        expect(view(initial)).toEqual({on: false, ready: false});
        expect(view(optionsReducer(initial, loadOptions.pending("req")))).toEqual({on: false, ready: false});
    });

    it("stays ready while the options are loaded again", () => {
        let state = optionsReducer(initial, loadOptions.fulfilled(loaded, "req"));
        expect(view(state)).toEqual({on: true, ready: true});
        state = optionsReducer(state, loadOptions.pending("req2"));
        expect(view(state)).toEqual({on: true, ready: true});
    });

    it("uses the old view if the options cannot be loaded", () => {
        const state = optionsReducer(initial, loadOptions.rejected(new Error("offline"), "req"));
        expect(view(state)).toEqual({on: false, ready: true});
    });

    it("changes only once it is saved", () => {
        let state = optionsReducer(initial, setNewExerciseView.pending("req", true));
        expect(view(state).on).toBe(false);
        state = optionsReducer(state, setNewExerciseView.rejected(new Error("offline"), "req", true));
        expect(view(state).on).toBe(false);
        state = optionsReducer(state, setNewExerciseView.fulfilled(true, "req", true));
        expect(view(state).on).toBe(true);
    });

    it("is reset on logout", () => {
        let state = optionsReducer(initial, loadOptions.fulfilled(loaded, "req"));
        state = optionsReducer(state, logoutUser.fulfilled({username: "", anonymous: true}, "req"));
        expect(view(state)).toEqual({on: false, ready: false});
    });
});
