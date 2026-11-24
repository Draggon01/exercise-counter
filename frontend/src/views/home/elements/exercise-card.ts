import {css, html, nothing, PropertyValues} from 'lit';
import {touchStyles} from "../../../styles/touch";
import {customElement, property, state} from 'lit/decorators.js';
import {ExerciseDto} from "../models/exerciseDto";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {selectCurrentUser} from "../../login/slice/userSlice";
import {UserDto} from "../../login/models/userDto";
import {navigate} from "../../../utils/navigation";
import {vibrate} from "../../../utils/preferences";
import {CheckDto} from "../models/checkDto";
import {RootState, store} from "../../../store";
import {loadExerciseLog, saveExerciseLog} from "../slice/exerciseSlice";
import {selectAutoCollapse} from "../../options/slice/optionsSlice";
import {selectCanChooseReminders, selectReminders} from "../../options/slice/pushSlice";
import {formatTimeLeft, isUrgent} from "../../../utils/format";
import {formatGoal, streakOf} from "../../../utils/exercise";
import "./exercise-finishers";
import "./exercise-menu";
import "./exercise-progress";
import "./exercise-sort-controls";
import {cardStyles} from "./card-styles";

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
    static styles = [cardStyles, touchStyles, css`
        .card {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-3);
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

        .actions {
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        sl-icon-button {
            font-size: 1.1rem;
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

    /** Reminders can be chosen (server offers them, this device gets them). */
    @state()
    private _canRemind = false;

    /** Exercises the user gets reminders for. */
    @state()
    private _reminders: string[] = [];

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
        this._canRemind = selectCanChooseReminders(state);
        this._reminders = selectReminders(state);
        if (!this._autoCollapse) {
            this._collapsed = false;
        }
    }

    private _myStreak(): number | undefined {
        return streakOf(this.finishedUser, this.user?.username);
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

    private _hasReminder(): boolean {
        return this._reminders.includes(this.item.exerciseId);
    }

    render() {
        const streak = this._myStreak();
        return html`
            <article class="card ${this.checked ? "done" : ""}">
                <div class="card-header">
                    <div class="title">
                        <h2 class="headline">${this.item.exerciseTitle}</h2>
                        <div class="subtitle">
                            <span>${formatGoal(this.item)}</span>
                            <span>·</span>
                            ${this.checked
                                    ? html`<span>Done for this period</span>`
                                    : html`<span class="${isUrgent(this.item.timeLeftSeconds) ? "urgent" : ""}">
                                        ${formatTimeLeft(this.item.timeLeftSeconds)}</span>`}
                            ${this._canRemind && this._hasReminder() ? html`
                                <sl-icon class="reminder-icon" name="bell-fill" label="Reminder on"></sl-icon>
                            ` : nothing}
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
                ${this._collapsed || this.editMode ? nothing : this._renderBody()}
            </article>
        `;
    }

    private _renderSortControls() {
        return html`
            <exercise-sort-controls @move-up="${this._moveUpClick}"
                                    @move-down="${this._moveDownClick}"></exercise-sort-controls>
        `;
    }

    private _renderMenu() {
        return html`
            <exercise-menu .item="${this.item}"
                           @menu-edit="${() => this._emit(ExerciseCardEvents.edit, this.item)}"
                           @menu-hide="${() => this._emit(ExerciseCardEvents.hide, this.item)}"
                           @menu-delete="${() => this._emit(ExerciseCardEvents.delete, this.item)}"></exercise-menu>
        `;
    }

    private _renderBody() {
        return html`
            <exercise-progress .item="${this.item}" .value="${this._progress}" ?done="${this.checked}"
                               @progress-changed="${this._saveProgress}"></exercise-progress>
            <exercise-finishers .checks="${this.finishedUser}"></exercise-finishers>
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

    private _toggleCollapse = () => {
        if (!this._autoCollapse) return;
        this._collapsed = !this._collapsed;
    }

    private _emit<T>(type: string, detail: T) {
        this.dispatchEvent(new CustomEvent<T>(type, {detail}));
    }

    private _moveUpClick = () => this._emit(ExerciseCardEvents.moveUp, this.item);

    private _moveDownClick = () => this._emit(ExerciseCardEvents.moveDown, this.item);

    private _toggleFinished = () => {
        if (!this.checked) vibrate(30); // short feedback on phones when marking it done
        this._emit(ExerciseCardEvents.checkChanged, !this.checked);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-card": ExerciseCard;
    }
}
