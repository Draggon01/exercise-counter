import {css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {ExerciseDto} from "../models/exerciseDto";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {selectCurrentUser} from "../../login/slice/userSlice";
import {UserDto} from "../../login/models/userDto";
import {CustomRouter} from "../../../index";
import {CheckDto} from "../models/checkDto";
import {RootState, store} from "../../../store";
import {loadExerciseLog, saveExerciseLog} from "../slice/exerciseSlice";
import {selectAutoCollapse} from "../../options/slice/optionsSlice";
import {formatDuration, formatTimeLeft, isUrgent} from "../../../utils/format";
import {isRepExercise, isTimeExercise} from "../../../utils/exercise";
import "./exercise-timer";
import "./rep-counter";

@customElement("exercise-card")
export class ExerciseCard extends ConnectedLitElement {
    static styles = css`
        :host {
            width: 100%;
        }

        .card {
            padding: 12px 14px;
            width: 50%;
            margin: 6px auto;
            border-radius: 12px;
            border: 1px solid #c8e0e0;
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
            min-width: 340px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .headline {
            font-size: 1.05em;
            font-weight: 600;
            margin: 0;
            padding: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            color: #1a2e2e;
        }

        .actions {
            display: flex;
            align-items: center;
            gap: 2px;
            flex-shrink: 0;
        }

        .card-body {
            display: grid;
            grid-template-columns: max-content 1fr;
            gap: 4px 12px;
            align-items: center;
            font-size: 0.9em;
        }

        .label {
            color: #666;
            white-space: nowrap;
        }

        .value {
            font-weight: 600;
        }

        .divider {
            grid-column: 1 / -1;
            border: none;
            border-top: 1px solid #f0f0f0;
            margin: 2px 0;
        }

        .time-left {
            font-size: 0.85em;
            color: #888;
        }

        .no-finisher {
            color: #aaa;
        }

        .time-left.urgent {
            color: #e06c1a;
            font-weight: 600;
        }







        .card-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 6px;
            border-top: 1px solid #f0f0f0;
        }

        .finished-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9em;
            color: #555;
        }

        .hide-icon {
            color: #5bb8d4;
        }

        .trash-icon {
            color: #c0392b;
        }

        .stats-btn {
            padding: 0 4px;
        }

        .collapse-icon {
            color: #888;
        }

        .card.collapsed {
            gap: 0;
        }

        .sort-controls {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex-shrink: 0;
        }

        @media (max-width: 768px) {
            .card {
                width: 95%;
                min-width: unset;
            }

            .card-body {
                grid-template-columns: 1fr;
            }

            .label {
                color: #888;
                font-size: 0.8em;
                margin-bottom: 0;
            }

            .value {
                margin-bottom: 4px;
            }

            .divider {
                grid-column: 1;
            }

            .card-header {
                flex-wrap: wrap;
            }
        }

        @media (max-width: 400px) {
            .card {
                padding: 8px 10px;
                margin: 4px auto;
                gap: 6px;
            }

            .headline {
                font-size: 0.95em;
            }

            .card-body {
                font-size: 0.82em;
                gap: 3px 8px;
            }





            .card-footer {
                padding-top: 4px;
            }

            .finished-label {
                font-size: 0.82em;
            }
        }
    `;

    @property({type: Boolean})
    editMode: boolean = false;

    @property()
    item: ExerciseDto = {
        exerciseId: "",
        exerciseTitle: "",
        creator: ""
    } as ExerciseDto

    @property({type: Boolean})
    checked: boolean = false;

    @property()
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
        this._collapsed = this._autoCollapse && this.checked;
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

    private _formatTodayValue(): string {
        if (!this.item.exerciseValue) return 'not Set';
        if (isTimeExercise(this.item.exerciseType)) {
            const secs = parseInt(this.item.exerciseValue, 10);
            return isNaN(secs) ? this.item.exerciseValue : formatDuration(secs);
        }
        if (isRepExercise(this.item.exerciseType)) {
            return `${this.item.exerciseValue} reps`;
        }
        return this.item.exerciseValue;
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
        return html`
            <div class="card ${this._collapsed ? 'collapsed' : ''}">
                <div class="card-header">
                    <h2 class="headline">${this.item.exerciseTitle}</h2>
                    ${this.editMode ? html`
                        <div class="sort-controls">
                            <sl-icon-button name="chevron-up" @click="${this._moveUpClick}"></sl-icon-button>
                            <sl-icon-button name="chevron-down" @click="${this._moveDownClick}"></sl-icon-button>
                        </div>
                    ` : html`
                        <div class="actions">
                            ${this.user && this.user.username === this.item.creator ? html`
                                <sl-icon-button name="layer-backward" class="hide-icon"
                                                @click="${this._hideClick}"></sl-icon-button>
                                <sl-icon-button name="pencil" @click="${this._editClick}"></sl-icon-button>
                                <sl-icon-button name="trash" class="trash-icon"
                                                @click="${this._trashClick}"></sl-icon-button>
                            ` : html`
                                <sl-icon-button name="layer-backward" class="hide-icon"
                                                @click="${this._hideClick}"></sl-icon-button>
                            `}
                            ${this._autoCollapse ? html`
                                <sl-icon-button
                                        class="collapse-icon"
                                        name="${this._collapsed ? 'chevron-down' : 'chevron-up'}"
                                        @click="${this._toggleCollapse}">
                                </sl-icon-button>
                            ` : ''}
                        </div>
                    `}
                </div>
                ${!this._collapsed ? html`
                    <div class="card-body">
                        <span class="label">Today's Goal:</span>
                        <span class="value">${this._formatTodayValue()}</span>
                        ${isTimeExercise(this.item.exerciseType) ? html`
                            <span class="label">Timer:</span>
                            <exercise-timer .targetSeconds="${this._target()}" .completedSeconds="${this._progress}"
                                            @progress-changed="${this._saveProgress}"></exercise-timer>
                        ` : isRepExercise(this.item.exerciseType) ? html`
                            <span class="label">Progress:</span>
                            <rep-counter .target="${this._target()}" .value="${this._progress}"
                                         @progress-changed="${this._saveProgress}"></rep-counter>
                        ` : ''}
                        <hr class="divider">
                        <span class="label">Finished by:</span>
                        <span>
                            ${this.finishedUser.length === 0
                                    ? html`<span class="no-finisher">—</span>`
                                    : this.finishedUser.map((check, idx) =>
                                            check.user + " {" + check.streak + "}" + (idx < this.finishedUser.length - 1 ? ", " : ""))}
                        </span>
                        <span class="label">Time left:</span>
                        <span class="${isUrgent(this.item.timeLeftSeconds) ? 'time-left urgent' : 'time-left'}">${formatTimeLeft(this.item.timeLeftSeconds)}</span>
                    </div>
                    <div class="card-footer">
                        <sl-button class="stats-btn" variant="primary" size="small"
                                   @click="${() => void CustomRouter.goto('/statistics/' + this.item.exerciseId)}">
                            Statistics
                        </sl-button>
                        <div class="finished-label">
                            Finished
                            <sl-checkbox @sl-change="${this._checkChange}" ?checked=${this.checked}
                                         size="medium"></sl-checkbox>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private _toggleCollapse = () => {
        if (!this._autoCollapse) return;
        this._collapsed = !this._collapsed;
    }

    private _moveUpClick = () => {
        this.dispatchEvent(new CustomEvent("moveUp", {detail: this.item, bubbles: true, composed: true}))
    }

    private _moveDownClick = () => {
        this.dispatchEvent(new CustomEvent("moveDown", {detail: this.item, bubbles: true, composed: true}))
    }

    private _hideClick = () => {
        this.dispatchEvent(new CustomEvent("hideExercise", {detail: this.item}))
    }

    private _trashClick = () => {
        this.dispatchEvent(new CustomEvent("deleteExercise", {detail: this.item}))
    }

    private _editClick = () => {
        this.dispatchEvent(new CustomEvent("editExercise", {detail: this.item}))
    }

    private _checkChange = (e: any) => {
        if (this._autoCollapse) {
            this._collapsed = !this.checked;
        }
        this.dispatchEvent(new CustomEvent("checkChanged", {detail: e.target.checked}))
    }
}
