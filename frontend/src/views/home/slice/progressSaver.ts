import {store} from "../../../store";
import {runningTimer} from "../../../utils/running-timer";
import {progressChanged, saveExerciseLog} from "./exerciseSlice";

/** Progress the user just made (timer, counter): shown at once and saved. */
export function saveProgress(exerciseId: string, value: number) {
    store.dispatch(progressChanged({exerciseId, value}));
    store.dispatch(saveExerciseLog({exerciseId, value}));
}

// the running timer does not depend on an element that could save for it
runningTimer.save = saveProgress;
