import {html} from "lit";
import {customElement, property} from "lit/decorators.js";
import {LitElement} from "lit";
import {store} from "../../../store";
import {deleteExercise, unselectExercise} from "../slice/exerciseSlice";
import {ExerciseDto} from "../models/exerciseDto";
import "../../../components/confirm-dialog";

/** What the user is asked to confirm. */
export type ExerciseConfirmAction = { kind: "delete" | "hide", exercise: ExerciseDto };

/**
 * Asks before deleting / hiding an exercise and does it. The parent sets `action` to ask;
 * `closed` (detail: whether it was done) tells it to clear `action` again.
 */
@customElement("exercise-confirm")
export class ExerciseConfirm extends LitElement {

    @property({attribute: false})
    action?: ExerciseConfirmAction;

    render() {
        return html`
            <confirm-dialog label="Delete exercise" confirmLabel="Delete Exercise" cancelLabel="Close"
                            .open="${this.action?.kind === "delete"}"
                            @confirm="${this.confirm}" @cancel="${() => this.close(false)}">
                You are about to delete this exercise. This action cannot be undone.
                Are you sure you want to proceed?
            </confirm-dialog>
            <confirm-dialog label="Hide exercise" confirmLabel="Hide Exercise" variant="warning"
                            .open="${this.action?.kind === "hide"}"
                            @confirm="${this.confirm}" @cancel="${() => this.close(false)}">
                You are about to hide this exercise from your list.
                You can add it back at any time from the Browse view.
                Are you sure you want to proceed?
            </confirm-dialog>
        `;
    }

    private confirm = async () => {
        const action = this.action;
        if (!action) return;
        this.action = undefined; // closes the dialog at once, a second click does nothing
        const result = action.kind === "delete"
            ? await store.dispatch(deleteExercise(action.exercise))
            : await store.dispatch(unselectExercise(action.exercise.exerciseId));
        this.close(deleteExercise.fulfilled.match(result) || unselectExercise.fulfilled.match(result));
    }

    private close(done: boolean) {
        this.dispatchEvent(new CustomEvent<boolean>("closed", {detail: done}));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-confirm": ExerciseConfirm;
    }
}
