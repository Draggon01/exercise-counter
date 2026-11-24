import {css, html, nothing} from 'lit';
import {touchStyles} from "../../styles/touch";
import '../../components/page-header';
import {onAppRefresh} from "../../utils/refresh";
import '../../components/fab-button'
import {pageStyles} from "../../styles/page";
import {customElement, state} from "lit/decorators.js";
import {RootState, store} from '../../store';
import {ConnectedLitElement} from "../../connectedLitElement";
import {
    listExerciseLogs,
    listExercisesSelected,
    reorderExercises,
    selectAllExercises,
    selectExercisesStatus
} from './slice/exerciseSlice';
import {ExerciseDto} from "./models/exerciseDto";
import './elements/exercise-card'
import './elements/exercise-card-compact'
import './elements/exercise-confirm'
import {ExerciseConfirmAction} from './elements/exercise-confirm'
import '../../components/empty-state'
import {navigate} from "../../utils/navigation";
import {AsyncStoreState} from "../../commons";
import {UserDto} from '../login/models/userDto';
import {selectCurrentUser} from "../login/slice/userSlice";
import {CheckDto} from "./models/checkDto";
import {
    listChecksPerExercise,
    listUserChecks,
    selectAllChecks,
    selectChecksPerExercise
} from "./slice/checkSlice";
import {loadOptions, selectNewExerciseView, selectOptionsReady} from "../options/slice/optionsSlice";
import {loadPushState, loadReminders} from "../options/slice/pushSlice";
import {moveItem} from "../../utils/reorder";
import {SortableController} from "../../utils/sortable";
import {scrollParent} from "../../utils/scroll";
import {createDoneSync} from "./slice/doneSync";

/** Scroll position of the list when an exercise was opened (the view itself is replaced by the page). */
let scrollBeforeOpen: number | undefined;

@customElement("home-view")
export class HomeView extends ConnectedLitElement {

    @state()
    private listExercises: ExerciseDto[] = []

    @state()
    private listChecks: CheckDto[] = []

    @state()
    private user?: UserDto;

    @state()
    private confirmAction?: ExerciseConfirmAction;

    @state()
    private editMode = false;

    @state()
    private checks: Record<string, CheckDto[]> = {}



    static styles = [pageStyles, touchStyles, css`
        .header-icon {
            font-size: 1.25rem;
        }

        .exercise-list {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-3);
        }

        .skeleton {
            --border-radius: var(--app-radius);
            height: 180px;
        }

        .mobile-only {
            display: none;
        }

        @media (max-width: 768px) {
            .mobile-only {
                display: inline-block;
            }

            /* the floating "+" button (new exercise view: the icon in the top bar) takes over on phones */
            .desktop-only {
                display: none;
            }

            /* room for the floating button below the last card */
            .page-container.with-fab {
                padding-bottom: 80px;
            }
        }
    `];

    @state()
    private checksSelected: boolean = false;

    @state()
    private exercisesStatus: AsyncStoreState = "initial";

    /** Which cards to show depends on the options: skeletons until they are known. */
    @state()
    private optionsReady = false;

    @state()
    private newExerciseView = false;

    private logsRequested = false;

    private stopRefresh?: () => void;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(loadOptions());
        this.load();
        if (store.getState().push.status === "initial") {
            store.dispatch(loadPushState()); // the cards offer "Remind me" only on devices that get reminders
        }
        this.stopRefresh = onAppRefresh(() => Promise.all([
            this.load(),
            ...(this.newExerciseView ? [store.dispatch(listExerciseLogs())] : []),
        ]));
    }

    private load() {
        return Promise.all([
            store.dispatch(listExercisesSelected()),
            store.dispatch(listUserChecks()),
            store.dispatch(listChecksPerExercise()),
            store.dispatch(loadReminders()),
        ]);
    }

    stateChanged(state: RootState) {
        this.exercisesStatus = selectExercisesStatus(state);
        this.optionsReady = selectOptionsReady(state);
        this.newExerciseView = selectNewExerciseView(state);
        // the calm cards need the progress; with the old view every card loads its own
        if (this.optionsReady && this.newExerciseView && !this.logsRequested) {
            this.logsRequested = true;
            store.dispatch(listExerciseLogs());
        }
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
    }

    render() {
        return html`
            <div class="page-container ${this.newExerciseView ? "" : "with-fab"}">
            <page-header heading="${this.editMode ? "Edit order" : "My exercises"}">
                ${this.editMode ? html`
                    <sl-button slot="actions" size="small" variant="success" @click="${this.toggleEditMode}">
                        <sl-icon slot="prefix" name="check-lg"></sl-icon>
                        Done
                    </sl-button>
                ` : html`
                    <sl-button slot="actions" class="desktop-only" variant="primary" @click="${() => this.openForm()}">
                        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
                        New exercise
                    </sl-button>
                    ${this.newExerciseView ? html`
                        <sl-icon-button slot="actions" class="header-icon mobile-only" name="plus-lg" label="New exercise"
                                        @click="${() => this.openForm()}"></sl-icon-button>
                    ` : nothing}
                    ${this.listExercises.length > 1 ? html`
                        <sl-tooltip slot="actions" content="Edit order">
                            <sl-icon-button class="header-icon" name="arrow-down-up" label="Edit order"
                                            @click="${this.toggleEditMode}"></sl-icon-button>
                        </sl-tooltip>` : nothing}
                `}
            </page-header>

            <div class="exercise-list" @pointerdown="${this.sortable.start}">${this.renderItems()}</div>
            </div>
            ${this.editMode || this.newExerciseView || !this.optionsReady ? nothing : html`<fab-button label="New exercise" @click="${() => this.openForm()}"></fab-button>`}
            <exercise-confirm .action="${this.confirmAction}" @closed="${() => this.confirmAction = undefined}"></exercise-confirm>
        `;
    }

    private toggleEditMode = () => {
        this.editMode = !this.editMode;
    }

    private renderItems() {
        if (this.exercisesStatus === "error") {
            return html`
                <empty-state icon="cloud-slash" heading="Could not load your exercises"
                             text="Check your connection and try again.">
                    <sl-button @click="${() => store.dispatch(listExercisesSelected())}">Try again</sl-button>
                </empty-state>`;
        }
        if (!this.listReady()) {
            return [1, 2].map(() => html`<sl-skeleton effect="pulse" class="skeleton"></sl-skeleton>`);
        }
        if (this.listExercises.length === 0) {
            return html`
                <empty-state icon="trophy" heading="No exercises yet"
                             text="Create your own exercise or add one that friends and groups share.">
                    <sl-button variant="primary" @click="${() => this.openForm()}">
                        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
                        New exercise
                    </sl-button>
                    <sl-button @click="${() => navigate("/browse")}">
                        <sl-icon slot="prefix" name="search"></sl-icon>
                        Browse exercises
                    </sl-button>
                </empty-state>`;
        }
        const exerciseDtos = this.sortedExercises();
        return html`
            ${exerciseDtos.map((element, index) => {
                if (this.newExerciseView) {
                    return html`
                        <exercise-card-compact
                                data-exercise-card
                                .item="${element}"
                                .checked="${this.getChecked(element)}"
                                .finishedUser="${this.checks[element.exerciseId] ?? []}"
                                .editMode="${this.editMode}"
                                @move-up="${() => this.move(exerciseDtos, index, -1)}"
                                @move-down="${() => this.move(exerciseDtos, index, 1)}"
                                @open-exercise="${(e: CustomEvent<ExerciseDto>) => this.openExercise(e.detail)}"
                                @check-changed="${(e: CustomEvent<boolean>) => this.setFinished(element, e.detail)}"
                        ></exercise-card-compact>`;
                }
                return html`
                    <exercise-card
                            data-exercise-card
                            .item="${element}"
                            .checked="${this.getChecked(element)}"
                            .finishedUser="${this.checks[element.exerciseId] ?? []}"
                            .editMode="${this.editMode}"
                            @move-up="${() => this.move(exerciseDtos, index, -1)}"
                            @move-down="${() => this.move(exerciseDtos, index, 1)}"
                            @delete-exercise="${(e: CustomEvent<ExerciseDto>) => this.confirmAction = {kind: "delete", exercise: e.detail}}"
                            @edit-exercise="${(e: CustomEvent<ExerciseDto>) => this.openForm(e.detail)}"
                            @check-changed="${(e: CustomEvent<boolean>) => this.setFinished(element, e.detail)}"
                            @hide-exercise="${(e: CustomEvent<ExerciseDto>) => this.confirmAction = {kind: "hide", exercise: e.detail}}"
                    ></exercise-card>`;
            })}
        `;
    }

    private sortedExercises() {
        return [...this.listExercises].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    /** Done as shown: what the user just clicked (still being saved) or what the server has. */
    private getChecked(element: ExerciseDto) {
        return this.doneSync.pending(element.exerciseId) ?? this.isSavedAsDone(element.exerciseId);
    }

    private isSavedAsDone(exerciseId: string) {
        return this.listChecks.some(check => check.exerciseId === exerciseId);
    }

    /** Opens the page to create a new exercise, or to edit the given one. */
    private openForm(exercise?: ExerciseDto) {
        navigate(exercise ? `/exercises/${exercise.exerciseId}/edit` : "/exercises/new");
    }

    private openExercise(exercise: ExerciseDto) {
        scrollBeforeOpen = scrollParent(this)?.scrollTop;
        navigate(`/exercises/${exercise.exerciseId}`);
    }

    /** Back from an exercise: the list continues where it was left. */
    protected willUpdate() {
        if (scrollBeforeOpen === undefined || !this.listReady()) return;
        const top = scrollBeforeOpen;
        scrollBeforeOpen = undefined;
        void this.updateComplete.then(() => requestAnimationFrame(() => scrollParent(this)?.scrollTo(0, top)));
    }

    private listReady() {
        return this.exercisesStatus === "idle" && this.checksSelected && this.optionsReady;
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

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopRefresh?.();
    }

    private sortable = new SortableController(this, {
        items: "[data-exercise-card]",
        enabled: () => this.editMode,
        move: (from, to) =>
            store.dispatch(reorderExercises(moveItem(this.sortedExercises(), from, to).map(e => e.exerciseId))),
    });

    private doneSync = createDoneSync(() => this.requestUpdate());

    private setFinished(exercise: ExerciseDto, finished: boolean) {
        this.doneSync.set(exercise.exerciseId, finished, this.isSavedAsDone(exercise.exerciseId));
    }

}
