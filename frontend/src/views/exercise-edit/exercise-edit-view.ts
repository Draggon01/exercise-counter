import {css, html} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from "../../store";
import {ExerciseDto} from "../home/models/exerciseDto";
import {listExercisesSelected, saveExercise, selectAllExercises, selectExercisesStatus} from "../home/slice/exerciseSlice";
import {listUserMappings, selectUserMappingByUser} from "../groups/slice/groupSlice";
import {selectCurrentUser} from "../login/slice/userSlice";
import {AsyncStoreState} from "../../commons";
import {pageStyles} from "../../styles/page";
import {navigate} from "../../utils/navigation";
import {toast} from "../../components/toast";
import "../../components/page-header";
import "../../components/empty-state";
import "../home/elements/exercise-form";

/**
 * Page to create (/exercises/new) or edit (/exercises/:id/edit) an exercise.
 * A page instead of a dialog: more room on phones and the browser's back button works.
 */
@customElement("exercise-edit-view")
export class ExerciseEditView extends ConnectedLitElement {

    static styles = [pageStyles, css`
        .skeleton {
            --border-radius: var(--app-radius);
            height: 220px;
            margin-bottom: var(--app-space-4);
        }
    `];

    /** Id of the exercise to edit; empty for a new exercise. */
    @property()
    exerciseId = "";

    @state()
    private exercise?: ExerciseDto;

    @state()
    private status: AsyncStoreState = "initial";

    @state()
    private groups: string[] = [];

    @state()
    private saving = false;

    connectedCallback() {
        super.connectedCallback();
        if (this.exerciseId && selectExercisesStatus(store.getState()) !== "idle") {
            store.dispatch(listExercisesSelected());
        }
        store.dispatch(listUserMappings());
    }

    stateChanged(state: RootState) {
        this.status = selectExercisesStatus(state);
        const found = this.exerciseId
            ? selectAllExercises(state).find(e => e.exerciseId === this.exerciseId)
            : undefined;
        if (found !== this.exercise) {
            this.exercise = found;
        }
        const user = selectCurrentUser(state);
        this.groups = (user ? selectUserMappingByUser(state, user.username)?.groupInformation ?? [] : [])
            .filter(group => !group.isInvited)
            .map(group => group.groupName);
    }

    render() {
        const editing = !!this.exerciseId;
        return html`
            <div class="page-container">
                <page-header heading="${editing ? "Edit exercise" : "New exercise"}" backTo="/"></page-header>
                ${this.renderContent(editing)}
            </div>
        `;
    }

    private renderContent(editing: boolean) {
        if (editing && !this.exercise) {
            if (this.status === "idle" || this.status === "error") {
                return html`
                    <empty-state icon="question-circle" heading="Exercise not found"
                                 text="It may have been deleted or is not on your list.">
                        <sl-button @click="${() => navigate("/")}">Back to my exercises</sl-button>
                    </empty-state>`;
            }
            return [1, 2, 3].map(() => html`<sl-skeleton effect="pulse" class="skeleton"></sl-skeleton>`);
        }
        return html`
            <exercise-form .exercise="${this.exercise}" .groups="${this.groups}" ?saving="${this.saving}"
                           @save="${this.save}" @cancel="${() => navigate("/")}"></exercise-form>
        `;
    }

    private save = async (e: CustomEvent<ExerciseDto>) => {
        this.saving = true;
        const result = await store.dispatch(saveExercise(e.detail));
        this.saving = false;
        if (saveExercise.fulfilled.match(result)) {
            toast(this.exerciseId ? "Changes saved" : `"${e.detail.exerciseTitle}" created`, "success");
            navigate("/");
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-edit-view": ExerciseEditView;
    }
}
