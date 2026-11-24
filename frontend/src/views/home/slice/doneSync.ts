import {store} from "../../../store";
import {LatestValueSync} from "../../../utils/latest-value-sync";
import {CheckDto} from "../models/checkDto";
import {selectCurrentUser} from "../../login/slice/userSlice";
import {deleteCheck, listChecksPerExercise, saveCheck} from "./checkSlice";

/**
 * "Mark as done" / "Done" per exercise: shown at once, saved one request at a time (fast clicks send only the
 * last state). Afterwards the finishers and streaks are loaded again.
 */
export const createDoneSync = (onChange: () => void) => new LatestValueSync<boolean>(async (exerciseId, done) => {
    const check: CheckDto = {exerciseId, user: selectCurrentUser(store.getState())?.username ?? "", streak: -1};
    const result = done ? await store.dispatch(saveCheck(check)) : await store.dispatch(deleteCheck(check));
    const saved = saveCheck.fulfilled.match(result) || deleteCheck.fulfilled.match(result);
    if (saved) {
        store.dispatch(listChecksPerExercise());
    }
    return saved;
}, onChange);
