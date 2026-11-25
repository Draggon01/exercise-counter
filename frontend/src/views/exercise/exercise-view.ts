import {css, html, nothing, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {keyed} from "lit/directives/keyed.js";
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from "../../store";
import {pageStyles} from "../../styles/page";
import {toast} from "../../components/toast";
import {backPath, navigate, withBack} from "../../utils/navigation";
import {exerciseTarget, formatGoal, isTimeExercise, streakOf} from "../../utils/exercise";
import {formatTimeLeft, isUrgent} from "../../utils/format";
import {vibrate} from "../../utils/preferences";
import {onAppRefresh} from "../../utils/refresh";
import {runningTimer} from "../../utils/running-timer";
import {scrollParent} from "../../utils/scroll";
import {ExerciseDto} from "../home/models/exerciseDto";
import {CheckDto} from "../home/models/checkDto";
import {ExerciseConfirmAction} from "../home/elements/exercise-confirm";
import {
    loadExerciseLog,
    selectExercise,
    selectProgress
} from "../home/slice/exerciseSlice";
import {listChecksPerExercise, listUserChecks, selectAllChecks, selectChecksPerExercise} from "../home/slice/checkSlice";
import {saveProgress} from "../home/slice/progressSaver";
import {createDoneSync} from "../home/slice/doneSync";
import {selectCurrentUser} from "../login/slice/userSlice";
import {loadPushState, loadReminders, selectCanChooseReminders, selectReminders} from "../options/slice/pushSlice";
import {ExerciseStepDto} from "./models/exerciseDetailsDto";
import {hasPendingMedia, MediaPolling} from "./media-polling";
import {ExerciseDetailState, loadDetails, loadExercise, loadNote, saveNote, selectExerciseDetail} from "./slice/exerciseDetailSlice";
import "../../components/page-header";
import "../../components/empty-state";
import "../home/elements/exercise-confirm";
import "../home/elements/exercise-finishers";
import "../home/elements/exercise-menu";
import "../home/elements/exercise-progress";
import "./elements/exercise-description";
import "./elements/exercise-note";
import "./elements/exercise-steps";
import "./elements/guided-workout";
import "./elements/workout-dialog";

/**
 * Page of one exercise (/exercises/:id): timer / rep counter, who finished it, statistics and everything else
 * about it. Exercises that are not on the user's list (opened from Browse) can be looked at and added.
 */
@customElement("exercise-view")
export class ExerciseView extends ConnectedLitElement {

    static styles = [pageStyles, css`
        .content {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        .subtitle {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-1) var(--app-space-2);
            color: var(--app-text-muted);
        }

        .urgent {
            color: var(--app-warning);
            font-weight: 600;
        }

        .streak {
            padding: 2px var(--app-space-2);
            border-radius: var(--app-radius-pill);
            background: var(--app-warning-soft);
            color: var(--app-warning);
            font-size: 0.85em;
            font-weight: 600;
        }

        .panel {
            padding: var(--app-space-4);
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius);
            background: var(--app-surface);
            box-shadow: var(--app-shadow);
        }

        /* stays visible below the page header while scrolling to the rest of the page */
        .panel.running {
            position: sticky;
            top: var(--app-header-height);
            z-index: 5;
            border-color: var(--app-accent);
            box-shadow: var(--app-shadow-raised);
        }

        /* always reachable, like the bar of the exercise form */
        .actions {
            position: sticky;
            bottom: 0;
            display: flex;
            justify-content: space-between;
            gap: var(--app-space-2);
            padding: var(--app-space-3) 0;
            background: var(--app-bg);
            border-top: 1px solid var(--app-divider);
        }

        .guided {
            display: block;
            margin-top: var(--app-space-3);
        }

        .add-content {
            align-self: flex-start;
        }

        .details-failed {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-2);
            color: var(--app-text-muted);
        }

        .skeleton {
            --border-radius: var(--app-radius);
            height: 120px;
        }

        @media (max-width: 480px) {
            .actions sl-button {
                flex: 1;
            }
        }
    `];

    @property()
    exerciseId = "";

    @state()
    private detail?: ExerciseDetailState;

    @state()
    private username = "";

    /** The exercises the user finished in this period; undefined until loaded. */
    @state()
    private ownChecks?: CheckDto[];

    @state()
    private checks: Record<string, CheckDto[]> = {};

    @state()
    private progress?: number;

    @state()
    private reminderOn = false;

    @state()
    private confirmAction?: ExerciseConfirmAction;

    @state()
    private timerRunning = false;

    /** The large timer is open: a sticky box would keep it below the page header. */
    @state()
    private timerFocused = false;

    @state()
    private savingNote = false;

    @state()
    private adding = false;

    @state()
    private workoutDialogOpen = false;

    /** The steps of the guided workout that is running. */
    @state()
    private workoutSteps?: ExerciseStepDto[];

    /** Saves the workout time of the running workout. */
    private saveWorkout: (seconds: number) => void = () => undefined;

    private back = backPath();

    private polling = new MediaPolling(this);

    private doneSync = createDoneSync(() => this.requestUpdate());

    private stopRefresh?: () => void;
    private stopTimerUpdates?: () => void;

    connectedCallback() {
        super.connectedCallback();
        this.back = backPath();
        if (store.getState().push.status === "initial") {
            store.dispatch(loadPushState());
        }
        // the progress is not loaded again: that would interrupt a running timer
        this.stopRefresh = onAppRefresh(() => this.load());
        this.stopTimerUpdates = runningTimer.subscribe(this.updateTimerRunning);
        scrollParent(this)?.scrollTo(0, 0);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopRefresh?.();
        this.stopTimerUpdates?.();
    }

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has("exerciseId") && this.exerciseId) {
            this.back = backPath();
            this.workoutDialogOpen = false;
            this.workoutSteps = undefined;
            this.updateTimerRunning();
            void this.open(this.exerciseId);
            this.stateChanged(store.getState());
        }
    }

    private updateTimerRunning = () => {
        this.timerRunning = runningTimer.of(this.exerciseId) !== undefined;
    }

    private async open(exerciseId: string) {
        await this.load();
        const detail = selectExerciseDetail(store.getState(), exerciseId);
        if (detail.exercise && this.isOnList(detail.exercise)) {
            store.dispatch(loadExerciseLog(exerciseId));
        }
    }

    private load() {
        return Promise.all([
            store.dispatch(loadExercise(this.exerciseId)),
            store.dispatch(loadDetails(this.exerciseId)),
            store.dispatch(loadNote(this.exerciseId)),
            store.dispatch(listUserChecks()),
            store.dispatch(listChecksPerExercise()),
            store.dispatch(loadReminders()),
        ]);
    }

    stateChanged(state: RootState) {
        this.detail = selectExerciseDetail(state, this.exerciseId);
        this.polling.update(this.exerciseId, hasPendingMedia(this.detail.details));
        this.username = selectCurrentUser(state)?.username ?? "";
        if (state.checks.checks.status === "idle") {
            this.ownChecks = selectAllChecks(state);
        }
        if (state.checks.checksPerExercise.status === "idle") {
            this.checks = selectChecksPerExercise(state);
        }
        this.progress = selectProgress(state, this.exerciseId);
        this.reminderOn = selectCanChooseReminders(state) && selectReminders(state).includes(this.exerciseId);
    }

    render() {
        const exercise = this.detail?.exercise;
        return html`
            <div class="page-container" ?inert="${this.workoutSteps !== undefined}">
                <page-header heading="${exercise?.exerciseTitle ?? "Exercise"}" backTo="${this.back}">
                    ${exercise && this.isOnList(exercise) ? html`
                        <exercise-menu slot="actions" .item="${exercise}" withContent
                                       @menu-content="${this.editContent}"
                                       @menu-edit="${() => navigate(withBack(`/exercises/${this.exerciseId}/edit`, `/exercises/${this.exerciseId}`))}"
                                       @menu-hide="${() => this.confirmAction = {kind: "hide", exercise}}"
                                       @menu-delete="${() => this.confirmAction = {kind: "delete", exercise}}"></exercise-menu>
                    ` : nothing}
                </page-header>
                ${exercise ? this.renderExercise(exercise) : this.renderMissing()}
            </div>
            <exercise-confirm .action="${this.confirmAction}" @closed="${this.confirmClosed}"></exercise-confirm>
            <workout-dialog .open="${this.workoutDialogOpen}" .exerciseId="${this.exerciseId}"
                            .steps="${this.detail?.details?.steps ?? []}" .mode="${this.detail?.details?.guidedMode ?? "OFF"}"
                            @start-workout="${this.startWorkout}" @cancel="${() => this.workoutDialogOpen = false}"></workout-dialog>
            ${this.workoutSteps ? html`
                <guided-workout .steps="${this.workoutSteps}" .getReady="${this.detail?.details?.getReadySeconds ?? 0}" .label="${exercise?.exerciseTitle ?? ""}"
                                ?offerDone="${this.ownChecks !== undefined && !this.isDone()}" @mark-done="${this.toggleDone}"
                                @workout-progress="${(e: CustomEvent<number>) => this.saveWorkout(e.detail)}"
                                @workout-closed="${() => this.workoutSteps = undefined}"></guided-workout>` : nothing}
        `;
    }

    private renderMissing() {
        if (this.detail?.notFound) {
            return html`
                <empty-state icon="question-circle" heading="Exercise not found"
                             text="It may have been deleted or is not shared with you.">
                    <sl-button @click="${() => navigate("/")}">Back to my exercises</sl-button>
                </empty-state>`;
        }
        if (this.detail?.status === "error") {
            return html`
                <empty-state icon="cloud-slash" heading="Could not load the exercise"
                             text="Check your connection and try again.">
                    <sl-button @click="${() => this.open(this.exerciseId)}">Try again</sl-button>
                </empty-state>`;
        }
        return html`
            <div class="content">
                ${[1, 2].map(() => html`<sl-skeleton effect="pulse" class="skeleton"></sl-skeleton>`)}
            </div>`;
    }

    private renderExercise(exercise: ExerciseDto) {
        const onList = this.isOnList(exercise);
        const done = this.isDone();
        const finishers = this.checks[this.exerciseId] ?? [];
        const streak = streakOf(finishers, this.username);
        return html`
            <div class="content">
                <div class="subtitle">
                    <span>${formatGoal(exercise)}</span>
                    <span>·</span>
                    ${onList && done
                            ? html`<span>Done for this period</span>`
                            : html`<span class="${isUrgent(exercise.timeLeftSeconds) ? "urgent" : ""}">
                                ${formatTimeLeft(exercise.timeLeftSeconds)}</span>`}
                    ${streak && streak > 1 ? html`<span class="streak" title="Your streak">🔥 ${streak}</span>` : nothing}
                    ${this.reminderOn ? html`<sl-icon name="bell-fill" label="Reminder on"></sl-icon>` : nothing}
                    ${onList ? nothing : html`<span>· by ${exercise.creator}</span>`}
                </div>
                ${onList ? html`
                    <div class="panel ${this.timerRunning && !this.timerFocused ? "running" : ""}"
                         @timer-focus-changed="${(e: CustomEvent<boolean>) => this.timerFocused = e.detail}">
                        ${this.progress === undefined ? html`<sl-skeleton effect="pulse"></sl-skeleton>` : keyed(this.exerciseId, html`
                            <exercise-progress .item="${exercise}" .value="${this.progress}" ?done="${done}"
                                               compact shared @mark-done="${this.toggleDone}"
                                               @progress-changed="${this.saveProgress(this.exerciseId)}"></exercise-progress>
                        `)}
                        ${this.progress !== undefined && this.detail?.details?.steps.length && this.detail.details.guidedMode !== "OFF" ? html`
                            <sl-button class="guided" size="large" @click="${() => this.workoutDialogOpen = true}">
                                <sl-icon slot="prefix" name="list-ol"></sl-icon>
                                Guided workout
                            </sl-button>` : nothing}
                    </div>
                ` : nothing}
                ${this.renderDetails(exercise)}
                ${this.detail?.note === undefined ? nothing : keyed(this.exerciseId, html`
                    <exercise-note .text="${this.detail.note}" ?saving="${this.savingNote}"
                                   @save-note="${this.saveNote}"></exercise-note>`)}
                ${onList ? html`<exercise-finishers .checks="${finishers}"></exercise-finishers>` : nothing}
                <div class="actions">
                    <sl-button @click="${() => navigate(withBack(`/statistics/${this.exerciseId}`, `/exercises/${this.exerciseId}`))}">
                        <sl-icon slot="prefix" name="bar-chart"></sl-icon>
                        Statistics
                    </sl-button>
                    ${onList ? html`
                        <sl-button variant="${done ? "success" : "default"}" ?disabled="${!this.ownChecks}"
                                   @click="${this.toggleDone}">
                            <sl-icon slot="prefix" name="${done ? "check-circle-fill" : "circle"}"></sl-icon>
                            ${done ? "Done" : "Mark as done"}
                        </sl-button>
                    ` : html`
                        <sl-button variant="primary" ?loading="${this.adding}" @click="${this.addToList}">
                            <sl-icon slot="prefix" name="plus-lg"></sl-icon>
                            Add to my list
                        </sl-button>
                    `}
                </div>
            </div>
        `;
    }

    private renderDetails(exercise: ExerciseDto) {
        const details = this.detail?.details;
        if (!details) {
            return this.detail?.detailsFailed ? html`
                <div class="details-failed">
                    Could not load description and steps.
                    <sl-button size="small" @click="${() => store.dispatch(loadDetails(this.exerciseId))}">Try again</sl-button>
                </div>` : html`<sl-skeleton effect="pulse"></sl-skeleton>`;
        }
        if (!details.description && details.steps.length === 0) {
            return exercise.creator !== this.username ? nothing : html`
                <sl-button class="add-content" variant="text" size="small" @click="${this.editContent}">
                    <sl-icon slot="prefix" name="plus-lg"></sl-icon>
                    Add description or steps
                </sl-button>`;
        }
        return html`
            ${details.description ? html`
                <exercise-description .text="${details.description}"></exercise-description>` : nothing}
            ${details.steps.length > 0 ? keyed(this.exerciseId, html`
                <exercise-steps .steps="${details.steps}"></exercise-steps>`) : nothing}
        `;
    }

    private startWorkout = (e: CustomEvent<ExerciseStepDto[]>) => {
        const exercise = this.detail?.exercise;
        this.workoutDialogOpen = false;
        if (!exercise) return;
        runningTimer.pause(); // never two timers; saves first, so the workout counts on top
        const exerciseId = this.exerciseId;
        const before = this.progress ?? 0;
        const target = exerciseTarget(exercise);
        // time exercises: the workout time counts; reps are up to the user
        this.saveWorkout = seconds => {
            if (isTimeExercise(exercise.exerciseType) && before < target) {
                saveProgress(exerciseId, Math.min(target, before + seconds));
            }
        };
        this.workoutSteps = e.detail;
    }

    private saveNote = async (e: CustomEvent<string>) => {
        this.savingNote = true;
        await store.dispatch(saveNote({exerciseId: this.exerciseId, text: e.detail}));
        this.savingNote = false;
    }

    private editContent = () => navigate(`/exercises/${this.exerciseId}/content`);

    /** Only exercises on the home list have a position. */
    private isOnList(exercise: ExerciseDto) {
        return exercise.position != null;
    }

    private isSavedAsDone() {
        return (this.ownChecks ?? []).some(check => check.exerciseId === this.exerciseId);
    }

    private isDone() {
        return this.doneSync.pending(this.exerciseId) ?? this.isSavedAsDone();
    }

    private toggleDone = () => {
        const done = !this.isDone();
        if (done) vibrate(30);
        this.doneSync.set(this.exerciseId, done, this.isSavedAsDone());
    }

    /** Bound to the exercise it was rendered for: a removed timer reports its progress after the page changed. */
    private saveProgress(exerciseId: string) {
        return (e: CustomEvent<number>) => saveProgress(exerciseId, e.detail);
    }

    private addToList = async () => {
        this.adding = true;
        const result = await store.dispatch(selectExercise(this.exerciseId));
        if (selectExercise.fulfilled.match(result)) {
            toast("Added to your list", "success");
            await this.open(this.exerciseId);
        }
        this.adding = false;
    }

    private confirmClosed = (e: CustomEvent<boolean>) => {
        this.confirmAction = undefined;
        if (e.detail) navigate("/");
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-view": ExerciseView;
    }
}
