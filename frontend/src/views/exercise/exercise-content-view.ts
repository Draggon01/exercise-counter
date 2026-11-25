import {css, html, nothing} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {live} from "lit/directives/live.js";
import {repeat} from "lit/directives/repeat.js";
import type {SlRadioGroup, SlSelectEvent, SlTextarea} from "@shoelace-style/shoelace";
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from "../../store";
import {pageStyles} from "../../styles/page";
import {touchStyles} from "../../styles/touch";
import {toast} from "../../components/toast";
import {formatTarget} from "../../utils/format";
import {isPlainClick, navigate, withBack} from "../../utils/navigation";
import {moveItem} from "../../utils/reorder";
import {SortableController} from "../../utils/sortable";
import {selectCurrentUser} from "../login/slice/userSlice";
import {ExerciseStepDto, ExerciseStepRequest, GuidedMode} from "./models/exerciseDetailsDto";
import {
    addStep,
    deleteStep,
    ExerciseDetailState,
    loadDetails,
    loadExercise,
    MAX_STEPS,
    reorderSteps,
    saveDescription,
    saveWorkoutSettings,
    selectExerciseDetail,
    updateStep
} from "./slice/exerciseDetailSlice";
import "../../components/confirm-dialog";
import "../../components/empty-state";
import "../../components/page-header";
import "../home/elements/exercise-sort-controls";
import "./elements/step-dialog";
import "./elements/step-media-editor";
import {hasPendingMedia, MediaPolling} from "./media-polling";
import {MediaConfigDto, MediaUsageDto} from "./models/exerciseDetailsDto";
import {loadMediaConfig, loadMediaUsage, MediaUpload, selectMedia} from "./slice/mediaSlice";
import {formatMegabytes} from "../../utils/media-file";

/** Choices for the countdown before timed steps. */
const GET_READY_SECONDS = [0, 3, 5, 10, 15];

/** Page /exercises/:id/content: the creator edits description and steps. Every change is saved right away. */
@customElement("exercise-content-view")
export class ExerciseContentView extends ConnectedLitElement {

    static styles = [pageStyles, touchStyles, css`
        .content, .steps {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        .steps {
            gap: var(--app-space-2);
        }

        h3 {
            margin: 0;
        }

        .muted {
            margin: 0;
            color: var(--app-text-muted);
        }

        .step {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--app-space-1);
            padding: var(--app-space-2) var(--app-space-3);
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius);
            background: var(--app-surface);
        }

        .step[dragging] {
            position: relative;
            z-index: 5;
            border-color: var(--app-accent);
            box-shadow: var(--app-shadow-raised);
        }

        .step-text {
            flex: 1;
            min-width: 0;
            min-height: 44px;
            padding: 0;
            border: none;
            background: none;
            color: inherit;
            font: inherit;
            text-align: left;
            cursor: pointer;
        }

        .danger-item::part(base) {
            color: var(--app-danger);
        }

        .step-title {
            font-weight: 600;
            overflow-wrap: anywhere;
        }

        .step-target {
            font-size: 0.85em;
            color: var(--app-text-muted);
        }

        .note {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-2);
            font-size: 0.9em;
        }

        .note sl-icon {
            vertical-align: -0.125em;
        }

        .note a {
            color: var(--app-accent);
        }

        .add {
            align-self: flex-start;
        }

        sl-radio-group::part(button-group),
        sl-radio-group::part(button-group__base) {
            width: 100%;
        }

        /* large text */
        sl-radio-group::part(button-group__base) {
            flex-wrap: wrap;
        }

        sl-radio-button {
            flex: 1;
        }

        .skeleton {
            --border-radius: var(--app-radius);
            height: 120px;
        }

    `];

    @property()
    exerciseId = "";

    @state()
    private detail?: ExerciseDetailState;

    @state()
    private username = "";

    @state()
    private dialogOpen = false;

    /** Step in the dialog; undefined: a new one. */
    @state()
    private editedStep?: ExerciseStepDto;

    @state()
    private saving = false;

    @state()
    private stepToDelete?: ExerciseStepDto;

    /** The last save of the description (resolves also if it failed). */
    private descriptionSaved?: Promise<unknown>;

    @state()
    private mediaConfig?: MediaConfigDto;

    @state()
    private mediaUsage?: MediaUsageDto;

    @state()
    private uploads: Record<string, MediaUpload> = {};

    private polling = new MediaPolling(this, () => store.dispatch(loadMediaUsage()));

    private sortable = new SortableController(this, {
        items: ".step",
        move: (from, to) => this.move(from, to),
    });

    protected willUpdate(changed: Map<string, unknown>) {
        if (changed.has("exerciseId") && this.exerciseId) {
            this.load();
            this.stateChanged(store.getState());
        }
    }

    private load() {
        store.dispatch(loadExercise(this.exerciseId));
        store.dispatch(loadDetails(this.exerciseId));
        store.dispatch(loadMediaConfig());
        store.dispatch(loadMediaUsage());
    }

    stateChanged(state: RootState) {
        this.detail = selectExerciseDetail(state, this.exerciseId);
        this.polling.update(this.exerciseId, hasPendingMedia(this.detail.details));
        const media = selectMedia(state);
        this.mediaConfig = media.config;
        this.mediaUsage = media.usage;
        this.uploads = media.uploads;
        this.username = selectCurrentUser(state)?.username ?? "";
    }

    render() {
        return html`
            <div class="page-container">
                <page-header heading="Description & steps" backTo="/exercises/${this.exerciseId}"></page-header>
                ${this.renderContent()}
            </div>
            <step-dialog .open="${this.dialogOpen}" .step="${this.editedStep}" ?saving="${this.saving}"
                         @save-step="${this.saveStep}" @cancel="${() => this.dialogOpen = false}"></step-dialog>
            <confirm-dialog label="Delete step" confirmLabel="Delete" .open="${this.stepToDelete !== undefined}"
                            @confirm="${this.confirmDelete}" @cancel="${() => this.stepToDelete = undefined}">
                Delete “${this.stepToDelete?.title}”?
            </confirm-dialog>
        `;
    }

    private renderContent() {
        const {exercise, details, notFound, status, detailsFailed} = this.detail ?? {};
        if (notFound || (exercise && this.username && exercise.creator !== this.username)) {
            return html`
                <empty-state icon="question-circle" heading="${notFound ? "Exercise not found" : "Only the creator can edit this"}">
                    <sl-button @click="${() => navigate("/")}">Back to my exercises</sl-button>
                </empty-state>`;
        }
        if (!exercise || !details) {
            return status === "error" || detailsFailed ? html`
                <empty-state icon="cloud-slash" heading="Could not load the exercise"
                             text="Check your connection and try again.">
                    <sl-button @click="${() => this.load()}">Try again</sl-button>
                </empty-state>` : html`
                <div class="content">
                    ${[1, 2].map(() => html`<sl-skeleton effect="pulse" class="skeleton"></sl-skeleton>`)}
                </div>`;
        }
        const steps = details.steps;
        return html`
            <div class="content">
                <sl-textarea label="Description" placeholder="What is it good for, what should be taken care of?"
                             help-text="Everybody who sees the exercise can read it." rows="4" resize="auto"
                             maxlength="2000" .value="${details.description}"
                             @sl-change="${this.saveDescription}"></sl-textarea>
                <h3>Steps</h3>
                ${steps.length === 0 ? html`
                    <p class="muted">Split the exercise into steps, e.g. the single exercises of a knee workout.</p>
                ` : nothing}
                <div class="steps" @pointerdown="${this.sortable.start}">
                    ${repeat(steps, step => step.stepId, (step, i) => html`
                        <div class="step">
                            ${this.mediaConfig?.enabled || step.media ? html`
                                <step-media-editor .exerciseId="${this.exerciseId}" .step="${step}"
                                                   .config="${this.mediaConfig}" .upload="${this.uploads[step.stepId]}"></step-media-editor>
                            ` : nothing}
                            <button class="step-text" title="Edit step" @click="${() => this.openDialog(step)}">
                                <div class="step-title">${i + 1}. ${step.title}</div>
                                <div class="step-target">${formatTarget(step)}</div>
                            </button>
                            <sl-dropdown placement="bottom-end" hoist>
                                <sl-icon-button slot="trigger" name="three-dots-vertical" label="Actions for ${step.title}"></sl-icon-button>
                                <sl-menu @sl-select="${(e: SlSelectEvent) => this.stepAction(e.detail.item.value, step, i)}">
                                    <sl-menu-item value="edit"><sl-icon slot="prefix" name="pencil"></sl-icon>Edit</sl-menu-item>
                                    ${steps.length > 1 ? html`
                                        <sl-menu-item value="up" ?disabled="${i === 0}"><sl-icon slot="prefix" name="arrow-up"></sl-icon>Move up</sl-menu-item>
                                        <sl-menu-item value="down" ?disabled="${i === steps.length - 1}"><sl-icon slot="prefix" name="arrow-down"></sl-icon>Move down</sl-menu-item>
                                    ` : nothing}
                                    <sl-divider></sl-divider>
                                    <sl-menu-item value="delete" class="danger-item"><sl-icon slot="prefix" name="trash"></sl-icon>Delete</sl-menu-item>
                                </sl-menu>
                            </sl-dropdown>
                            ${steps.length > 1 ? html`<exercise-sort-controls gripOnly></exercise-sort-controls>` : nothing}
                        </div>
                    `)}
                </div>
                ${steps.length < MAX_STEPS ? html`
                    <sl-button class="add" @click="${() => this.openDialog()}">
                        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
                        Add step
                    </sl-button>
                ` : html`<p class="muted">An exercise can have up to ${MAX_STEPS} steps.</p>`}
                ${steps.length > 0 && this.mediaConfig?.enabled ? this.renderMediaNote(exercise.visibility) : nothing}
                ${steps.length > 0 ? html`
                    <sl-radio-group label="Guided workout" .value="${live(details.guidedMode)}"
                                    help-text="Leads through the steps one by one, with rests. Everybody can change the order or leave out steps."
                                    @sl-change="${(e: Event) => this.saveWorkout({guidedMode: (e.target as SlRadioGroup).value as GuidedMode})}">
                        <sl-radio-button value="OFF">Off</sl-radio-button>
                        <sl-radio-button value="ORDERED">Fixed order</sl-radio-button>
                        <sl-radio-button value="SHUFFLED">Shuffled</sl-radio-button>
                    </sl-radio-group>` : nothing}
                ${steps.length > 0 && details.guidedMode !== "OFF" ? html`
                    <sl-radio-group label="Get ready" .value="${live(String(details.getReadySeconds))}"
                                    help-text="Countdown before a step with a time, if there is no rest before it."
                                    @sl-change="${(e: Event) => this.saveWorkout({getReadySeconds: Number((e.target as SlRadioGroup).value)})}">
                        ${GET_READY_SECONDS.map(seconds => html`
                            <sl-radio-button value="${seconds}">${seconds === 0 ? "Off" : `${seconds} s`}</sl-radio-button>`)}
                    </sl-radio-group>` : nothing}
            </div>
        `;
    }

    private renderMediaNote(visibility?: string) {
        const usage = this.mediaUsage;
        const edit = html`<a href="/exercises/${this.exerciseId}/edit" @click="${this.openEdit}">Change</a>`;
        return html`
            <div class="muted note">
                <div><sl-icon name="eye"></sl-icon>
                    ${visibility === "PUBLIC" ? html`Everybody can see this exercise with its videos and photos.`
                            : visibility === "GROUPS" ? html`The groups you share this exercise with see its videos and photos, too.`
                            : html`This exercise is private, so only you (and who already has it on their list) can see its videos and photos. Share it, and the others see them, too.`}
                    ${edit}
                </div>
                <div><sl-icon name="camera-video"></sl-icon>
                    About 3 seconds are ideal, at most ${this.mediaConfig?.maxSeconds}. Sound is kept if it fits.
                    ${usage ? html`You use ${formatMegabytes(usage.usedBytes)} of ${formatMegabytes(usage.quotaBytes)}.` : nothing}
                </div>
            </div>`;
    }

    private openEdit = (e: MouseEvent) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        navigate(withBack(`/exercises/${this.exerciseId}/edit`, `/exercises/${this.exerciseId}/content`));
    }

    private stepAction(action: string, step: ExerciseStepDto, index: number) {
        if (action === "edit") this.openDialog(step);
        else if (action === "up") void this.move(index, index - 1);
        else if (action === "down") void this.move(index, index + 1);
        else if (action === "delete") this.stepToDelete = step;
    }

    private openDialog(step?: ExerciseStepDto) {
        this.editedStep = step;
        this.dialogOpen = true;
    }

    private saveDescription = async (e: Event) => {
        const description = (e.target as SlTextarea).value.trim();
        if (description === this.detail?.details?.description) return;
        const saving = store.dispatch(saveDescription({exerciseId: this.exerciseId, description}));
        this.descriptionSaved = saving;
        const result = await saving;
        if (saveDescription.fulfilled.match(result)) toast("Description saved", "success", 2000);
    }

    private saveWorkout = async (settings: { guidedMode?: GuidedMode, getReadySeconds?: number }) => {
        const exerciseId = this.exerciseId;
        // tapping here leaves the description field: both belong to one row, so one after the other
        await this.descriptionSaved;
        const result = await store.dispatch(saveWorkoutSettings({exerciseId, ...settings}));
        if (saveWorkoutSettings.fulfilled.match(result)) toast("Guided workout saved", "success", 2000);
        else this.requestUpdate(); // shows the saved value again
    }

    private saveStep = async (e: CustomEvent<ExerciseStepRequest>) => {
        this.saving = true;
        const exerciseId = this.exerciseId;
        const result = this.editedStep
            ? await store.dispatch(updateStep({exerciseId, stepId: this.editedStep.stepId, step: e.detail}))
            : await store.dispatch(addStep({exerciseId, step: e.detail}));
        this.saving = false;
        // failed: the dialog stays open with the input
        if (result.meta.requestStatus === "fulfilled") this.dialogOpen = false;
    }

    private confirmDelete = () => {
        if (this.stepToDelete) {
            store.dispatch(deleteStep({exerciseId: this.exerciseId, stepId: this.stepToDelete.stepId}));
        }
        this.stepToDelete = undefined;
    }

    private async move(from: number, to: number) {
        const ids = (this.detail?.details?.steps ?? []).map(step => step.stepId);
        if (to < 0 || to >= ids.length) return;
        await store.dispatch(reorderSteps({exerciseId: this.exerciseId, stepIds: moveItem(ids, from, to)}));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-content-view": ExerciseContentView;
    }
}
