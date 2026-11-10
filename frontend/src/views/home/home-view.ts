import {css, html} from 'lit';
import {customElement, state} from "lit/decorators.js";
import {RootState, store} from '../../store';
import {ConnectedLitElement} from "../../connectedLitElement";
import {
    deleteExercise,
    listExercisesSelected,
    reorderExercises,
    saveExercise,
    selectAllExercises,
    unselectExercise
} from './slice/exerciseSlice';
import {ExerciseDto} from "./models/exerciseDto";
import './elements/exercise-card'
import './elements/exercise-form-dialog'
import '../../components/confirm-dialog'
import {UserDto} from '../login/models/userDto';
import {selectCurrentUser} from "../login/slice/userSlice";
import {CheckDto} from "./models/checkDto";
import {
    deleteCheck,
    listChecksPerExercise,
    listUserChecks,
    saveCheck,
    selectAllChecks,
    selectChecksPerExercise
} from "./slice/checkSlice";
import {listUserMappings, selectUserMappingByUser} from "../groups/slice/groupSlice";
import {CustomRouter} from "../../index";
import {loadOptions} from "../options/slice/optionsSlice";
import {loadExerciseMeta, selectExerciseTypes, selectVisibilities} from "../../shared-slices/meta/metaSlice";


@customElement("home-view")
export class HomeView extends ConnectedLitElement {

    @state()
    private listExercises: ExerciseDto[] = []

    @state()
    private listChecks: CheckDto[] = []

    @state()
    private user?: UserDto;

    @state()
    private exerciseTypes: Record<string, string> = {};

    @state()
    private visibility: string[] = [];

    /** Exercise form: open for a new exercise (exerciseToEdit undefined) or to edit one. */
    @state()
    private formOpen = false;

    @state()
    private exerciseToEdit?: ExerciseDto;

    @state()
    private exerciseToDelete?: ExerciseDto;

    @state()
    private exerciseToHide?: ExerciseDto;

    @state()
    private editMode = false;

    @state()
    private checks: Record<string, CheckDto[]> = {}

    @state()
    private groups: string[] = [];



    static styles = css`
        :host {
            position: relative;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            overflow-y: auto;
            height: 100%;
        }

        .addButton {
            margin-top: 1rem;
        }

        .action-bar {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: center;
        }

        @media (max-width: 768px) {
            .action-bar {
                width: 100%;
                padding: 0 8px;
                box-sizing: border-box;
            }
        }

        @media (max-width: 400px) {
            .action-bar {
                flex-direction: column;
                align-items: stretch;
                padding: 0 8px;
                gap: 6px;
            }

            .addButton {
                width: 100%;
            }
        }
    `

    @state()
    private checksSelected: boolean = false;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(listExercisesSelected());
        store.dispatch(listUserChecks())
        store.dispatch(listChecksPerExercise());
        store.dispatch(listUserMappings());
        store.dispatch(loadOptions());
        store.dispatch(loadExerciseMeta());
    }

    stateChanged(state: RootState) {
        this.exerciseTypes = selectExerciseTypes(state);
        this.visibility = selectVisibilities(state);
        if (state.checks.checks.status === "idle") {
            this.listChecks = selectAllChecks(state);
        }
        if (state.exercise.exercises.status === "idle") {
            this.listExercises = selectAllExercises(state);
        }
        if (state.user.status === "idle") {
            this.user = selectCurrentUser(state);
        }
        if (state.checks.checksPerExercise.status === "idle") {
            this.checksSelected = true;
            this.checks = selectChecksPerExercise(state);
        }
        if (this.user && state.group.userMappings.status === "idle") {
            let groups = selectUserMappingByUser(state, this.user.username)
            this.groups = groups ? groups.groupInformation.map(group => group.groupName) : [];
        }
    }

    render() {
        return html`
            <div class="action-bar">
                <sl-button class="addButton" variant="primary" @click="${() => this.openForm()}">
                    Add Exercise
                </sl-button>

                <sl-button class="addButton" variant="primary" @click="${() => {
                    void CustomRouter.goto(`/browse`);
                }}">
                    Browse Exercises
                </sl-button>

                <sl-button class="addButton" variant="${this.editMode ? 'success' : 'neutral'}" @click="${() => {
                    this.editMode = !this.editMode;
                }}">
                    ${this.editMode ? 'Done' : 'Edit Order'}
                </sl-button>
            </div>

            ${this.renderItems()}
            <exercise-form-dialog .open="${this.formOpen}"
                                  .exercise="${this.exerciseToEdit}"
                                  .exerciseTypes="${this.exerciseTypes}"
                                  .visibilities="${this.visibility}"
                                  .groups="${this.groups}"
                                  @save="${this.saveExerciseForm}"
                                  @close="${() => this.formOpen = false}">
            </exercise-form-dialog>
            <confirm-dialog label="Delete exercise" confirmLabel="Delete Exercise" cancelLabel="Close"
                            .open="${this.exerciseToDelete !== undefined}"
                            @confirm="${this.confirmDelete}"
                            @cancel="${() => this.exerciseToDelete = undefined}">
                You are about to delete this exercise. This action cannot be undone.
                Are you sure you want to proceed?
            </confirm-dialog>
            <confirm-dialog label="Hide exercise" confirmLabel="Hide Exercise" variant="warning"
                            .open="${this.exerciseToHide !== undefined}"
                            @confirm="${this.confirmHide}"
                            @cancel="${() => this.exerciseToHide = undefined}">
                You are about to hide this exercise from your list.
                You can add it back at any time from the Browse view.
                Are you sure you want to proceed?
            </confirm-dialog>

        `;
    }

    private confirmDelete = () => {
        if (this.exerciseToDelete) {
            store.dispatch(deleteExercise(this.exerciseToDelete));
        }
        this.exerciseToDelete = undefined;
    }

    private confirmHide = () => {
        if (this.exerciseToHide?.exerciseId) {
            store.dispatch(unselectExercise(this.exerciseToHide.exerciseId));
        }
        this.exerciseToHide = undefined;
    }

    private renderItems() {
        if (!this.checksSelected) {
            return html``
        }
        let exerciseDtos = [...this.listExercises].sort((a, b) => {
            const aOrder = a.position ?? 0;
            const bOrder = b.position ?? 0;
            return aOrder - bOrder;
        });
        return html`
            ${exerciseDtos.map((element, index) => {
                return html`
                    <exercise-card
                            .item="${element}"
                            .checked="${this.getChecked(element)}"
                            .finishedUser="${this.checks[element.exerciseId] ?? []}"
                            .editMode="${this.editMode}"
                            @move-up="${() => this.move(exerciseDtos, index, -1)}"
                            @move-down="${() => this.move(exerciseDtos, index, 1)}"
                            @delete-exercise="${(e: CustomEvent<ExerciseDto>) => this.exerciseToDelete = e.detail}"
                            @edit-exercise="${(e: CustomEvent<ExerciseDto>) => this.openForm(e.detail)}"
                            @check-changed="${(e: CustomEvent<boolean>) => this.setFinished(element, e.detail)}"
                            @hide-exercise="${(e: CustomEvent<ExerciseDto>) => this.exerciseToHide = e.detail}"
                    ></exercise-card>`;
            })}
        `;
    }

    private getChecked(element: ExerciseDto) {
        let check = this.listChecks.find(check => check.exerciseId === element.exerciseId);
        return !!check;
    }

    /** Opens the exercise form for a new exercise, or to edit the given one. */
    private openForm(exercise?: ExerciseDto) {
        this.exerciseToEdit = exercise ? {...exercise} : undefined;
        this.formOpen = true;
    }

    /** Swaps the exercise at {@code index} with its neighbour and saves the new order. */
    private move(order: ExerciseDto[], index: number, by: -1 | 1) {
        const target = index + by;
        if (target < 0 || target >= order.length) {
            return;
        }
        const newOrder = [...order];
        [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
        store.dispatch(reorderExercises(newOrder.map(e => e.exerciseId)));
    }

    private async setFinished(exercise: ExerciseDto, finished: boolean) {
        const check: CheckDto = {exerciseId: exercise.exerciseId, user: this.user?.username ?? "", streak: -1};
        await store.dispatch(finished ? saveCheck(check) : deleteCheck(check));
        store.dispatch(listChecksPerExercise());
    }

    private saveExerciseForm = (e: CustomEvent<ExerciseDto>) => {
        store.dispatch(saveExercise(e.detail));
        this.formOpen = false;
    }
}
