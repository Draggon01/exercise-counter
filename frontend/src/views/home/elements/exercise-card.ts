import {css, html, nothing, PropertyValues} from 'lit';
import {touchStyles} from "../../../styles/touch";
import {customElement, property, state} from 'lit/decorators.js';
import {ExerciseDto} from "../models/exerciseDto";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {selectCurrentUser} from "../../login/slice/userSlice";
import {UserDto} from "../../login/models/userDto";
import {navigate} from "../../../utils/navigation";
import {CheckDto} from "../models/checkDto";
import {RootState, store} from "../../../store";
import {loadExerciseLog, saveExerciseLog} from "../slice/exerciseSlice";
import {selectAutoCollapse} from "../../options/slice/optionsSlice";
import type {SlSelectEvent} from "@shoelace-style/shoelace";
import {formatDuration, formatTimeLeft, isUrgent} from "../../../utils/format";
import {isRepExercise, isTimeExercise} from "../../../utils/exercise";
import "./exercise-timer";
import "./rep-counter";

/**
 * Events of {@link ExerciseCard}. Detail is the card's {@link ExerciseDto}, except for
 * `checkChanged` (detail: the new "finished" state as boolean).
 * Lit templates need the literal names, e.g. `@delete-exercise=${...}`.
 */
export const ExerciseCardEvents = {
    moveUp: "move-up",
    moveDown: "move-down",
    hide: "hide-exercise",
    delete: "delete-exercise",
    edit: "edit-exercise",
    checkChanged: "check-changed",
} as const;

/**
 * One exercise on the home page: title with goal and time left, progress (timer / reps),
 * who finished it (with streaks) and the "done" toggle. Cards of finished exercises
 * collapse automatically if the user enabled it in the options.
 */
@customElement("exercise-card")
export class ExerciseCard extends ConnectedLitElement {
    static styles = [touchStyles, css`
        :host {
            display: block;
        }

        .card {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-3);
            box-sizing: border-box;
            width: 100%;
            padding: var(--app-space-3) var(--app-space-4);
            border: 1px solid var(--app-border);
            border-left: 4px solid var(--app-border);
            border-radius: var(--app-radius);
            background: var(--app-surface);
            box-shadow: var(--app-shadow);
            transition: border-color 0.2s;
        }

        .card.done {
            border-left-color: var(--app-success);
        }

        /* ---- header */
        .card-header {
            display: flex;
            align-items: flex-start;
            gap: var(--app-space-2);
        }

        .title {
            flex: 1;
            min-width: 0;
        }

        .headline {
            margin: 0;
            font-size: 1.1em;
            font-weight: 600;
            line-height: 1.3;
            color: var(--app-text);
            overflow-wrap: anywhere;
        }

        .done .headline {
            color: var(--app-text-muted);
        }

        .subtitle {
            display: flex;
            flex-wrap: wrap;
            gap: var(--app-space-1) var(--app-space-2);
            margin-top: 2px;
            font-size: 0.85em;
            color: var(--app-text-muted);
        }

        .urgent {
            color: var(--app-warning);
            font-weight: 600;
        }

        .actions {
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        .streak {
            padding: 2px var(--app-space-2);
            border-radius: var(--app-radius-pill);
            background: var(--app-warning-soft);
            color: var(--app-warning);
            font-size: 0.8em;
            font-weight: 600;
            white-space: nowrap;
        }

        sl-icon-button {
            font-size: 1.1rem;
            color: var(--app-text-subtle);
        }

        .danger-item::part(base) {
            color: var(--app-danger);
        }

        /* ---- body */
        .progress {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-2);
        }

        sl-progress-bar {
            --height: 6px;
            --indicator-color: var(--app-accent);
        }

        .done sl-progress-bar {
            --indicator-color: var(--app-success);
        }

        .finishers {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-1) var(--app-space-2);
            font-size: 0.85em;
            color: var(--app-text-muted);
        }

        .finisher {
            padding: 2px var(--app-space-2);
            border-radius: var(--app-radius-pill);
            background: var(--app-success-soft);
            color: var(--app-success-strong);
        }

        .no-finisher {
            color: var(--app-text-subtle);
        }

        /* ---- footer */
        .card-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--app-space-2);
            padding-top: var(--app-space-3);
            border-top: 1px solid var(--app-divider);
        }

        @media (max-width: 400px) {
            .card {
                padding: var(--app-space-3);
            }
        }
    `];

    @property({type: Boolean})
    editMode: boolean = false;

    @property({attribute: false})
    item: ExerciseDto = {exerciseId: "", exerciseTitle: "", creator: ""} as ExerciseDto;

    /** The current user finished the exercise in this period. */
    @property({type: Boolean})
    checked: boolean = false;

    /** Everybody who finished it in this period, with their streak. */
    @property({attribute: false})
    finishedUser: CheckDto[] = [];

    @state()
    user?: UserDto;

    @state()
    private _collapsed = false;

    @state()
    private _autoCollapse = true;

    /** Seconds (time exercises) or reps done in the current period. */
    @state()
    private _progress = 0;

    async connectedCallback() {
        super.connectedCallback();
        if (this.item) {
            await this._loadLog();
        }
    }

    protected willUpdate(changed: PropertyValues<this>) {
        // collapse follows the real "done" state, so a failed save does not collapse the card
        if (changed.has("checked") && this._autoCollapse) {
            this._collapsed = this.checked;
        }
    }

    stateChanged(state: RootState) {
        if (state.user.status === "idle") {
            this.user = selectCurrentUser(state);
        }
        this._autoCollapse = selectAutoCollapse(state);
        if (!this._autoCollapse) {
            this._collapsed = false;
        }
    }

    /** Target of the current period: seconds for time exercises, reps otherwise. */
    private _target(): number {
        return parseInt(this.item.exerciseValue ?? '0', 10) || 0;
    }

    private _formatGoal(): string {
        if (!this.item.exerciseValue) return 'No goal set';
        if (isTimeExercise(this.item.exerciseType)) {
            const secs = parseInt(this.item.exerciseValue, 10);
            return isNaN(secs) ? this.item.exerciseValue : formatDuration(secs);
        }
        if (isRepExercise(this.item.exerciseType)) {
            return `${this.item.exerciseValue} reps`;
        }
        return this.item.exerciseValue;
    }

    private _myStreak(): number | undefined {
        return this.finishedUser.find(check => check.user === this.user?.username)?.streak;
    }

    private async _loadLog() {
        if (!this.item.exerciseId) return;
        try {
            const log = await store.dispatch(loadExerciseLog(this.item.exerciseId)).unwrap();
            this._progress = log.value ?? 0;
        } catch (_) { /* no saved progress */
        }
    }

    private _saveProgress = (e: CustomEvent<number>) => {
        this._progress = e.detail;
        if (this.item.exerciseId) {
            store.dispatch(saveExerciseLog({exerciseId: this.item.exerciseId, value: e.detail}));
        }
    }

    render() {
        const streak = this._myStreak();
        return html`
            <article class="card ${this.checked ? "done" : ""}">
                <div class="card-header">
                    <div class="title">
                        <h2 class="headline">${this.item.exerciseTitle}</h2>
                        <div class="subtitle">
                            <span>${this._formatGoal()}</span>
                            <span>·</span>
                            ${this.checked
                                    ? html`<span>Done for this period</span>`
                                    : html`<span class="${isUrgent(this.item.timeLeftSeconds) ? "urgent" : ""}">
                                        ${formatTimeLeft(this.item.timeLeftSeconds)}</span>`}
                        </div>
                    </div>
                    <div class="actions">
                        ${streak && streak > 1 ? html`<span class="streak" title="Your streak">🔥 ${streak}</span>` : nothing}
                        ${this.editMode ? this._renderSortControls() : this._renderMenu()}
                        ${this._autoCollapse && !this.editMode ? html`
                            <sl-icon-button name="${this._collapsed ? "chevron-down" : "chevron-up"}"
                                            label="${this._collapsed ? "Expand" : "Collapse"}"
                                            @click="${this._toggleCollapse}"></sl-icon-button>
                        ` : nothing}
                    </div>
                </div>
                ${this._collapsed ? nothing : this._renderBody()}
            </article>
        `;
    }

    private _renderSortControls() {
        return html`
            <sl-icon-button name="arrow-up" label="Move up" @click="${this._moveUpClick}"></sl-icon-button>
            <sl-icon-button name="arrow-down" label="Move down" @click="${this._moveDownClick}"></sl-icon-button>
        `;
    }

    private _renderMenu() {
        const isCreator = this.user?.username === this.item.creator;
        return html`
            <sl-dropdown placement="bottom-end">
                <sl-icon-button slot="trigger" name="three-dots-vertical" label="More actions"></sl-icon-button>
                <sl-menu @sl-select="${this._menuSelect}">
                    ${isCreator ? html`
                        <sl-menu-item value="edit"><sl-icon slot="prefix" name="pencil"></sl-icon>Edit</sl-menu-item>
                    ` : nothing}
                    <sl-menu-item value="hide"><sl-icon slot="prefix" name="eye-slash"></sl-icon>Hide from my list</sl-menu-item>
                    ${isCreator ? html`
                        <sl-divider></sl-divider>
                        <sl-menu-item value="delete" class="danger-item">
                            <sl-icon slot="prefix" name="trash"></sl-icon>Delete
                        </sl-menu-item>
                    ` : nothing}
                </sl-menu>
            </sl-dropdown>
        `;
    }

    private _renderBody() {
        return html`
            ${this._renderProgress()}
            <div class="finishers">
                <span>Finished by</span>
                ${this.finishedUser.length === 0
                        ? html`<span class="no-finisher">nobody yet</span>`
                        : this.finishedUser.map(check => html`
                            <span class="finisher">${check.user}${check.streak > 1 ? ` 🔥${check.streak}` : ""}</span>
                        `)}
            </div>
            <div class="card-footer">
                <sl-button variant="text" size="small" @click="${() => navigate('/statistics/' + this.item.exerciseId)}">
                    <sl-icon slot="prefix" name="bar-chart"></sl-icon>
                    Statistics
                </sl-button>
                <sl-button variant="${this.checked ? "success" : "default"}" size="small" pill
                           @click="${this._toggleFinished}">
                    <sl-icon slot="prefix" name="${this.checked ? "check-circle-fill" : "circle"}"></sl-icon>
                    ${this.checked ? "Done" : "Mark as done"}
                </sl-button>
            </div>
        `;
    }

    private _renderProgress() {
        if (isTimeExercise(this.item.exerciseType)) {
            return html`
                <div class="progress">
                    <exercise-timer .targetSeconds="${this._target()}" .completedSeconds="${this._progress}"
                                    .label="${this.item.exerciseTitle}"
                                    @progress-changed="${this._saveProgress}"></exercise-timer>
                </div>`;
        }
        if (isRepExercise(this.item.exerciseType)) {
            const target = this._target();
            const percent = target > 0 ? Math.min(100, Math.round(this._progress / target * 100)) : 0;
            return html`
                <div class="progress">
                    <rep-counter .target="${target}" .value="${this._progress}"
                                 @progress-changed="${this._saveProgress}"></rep-counter>
                    <sl-progress-bar value="${percent}" label="Progress"></sl-progress-bar>
                </div>`;
        }
        return nothing;
    }

    private _toggleCollapse = () => {
        if (!this._autoCollapse) return;
        this._collapsed = !this._collapsed;
    }

    private _menuSelect = (e: SlSelectEvent) => {
        switch (e.detail.item.value) {
            case "edit":
                return this._emit(ExerciseCardEvents.edit, this.item);
            case "hide":
                return this._emit(ExerciseCardEvents.hide, this.item);
            case "delete":
                return this._emit(ExerciseCardEvents.delete, this.item);
        }
    }

    private _emit<T>(type: string, detail: T) {
        this.dispatchEvent(new CustomEvent<T>(type, {detail}));
    }

    private _moveUpClick = () => this._emit(ExerciseCardEvents.moveUp, this.item);

    private _moveDownClick = () => this._emit(ExerciseCardEvents.moveDown, this.item);

    private _toggleFinished = () => {
        this._emit(ExerciseCardEvents.checkChanged, !this.checked);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-card": ExerciseCard;
    }
}
