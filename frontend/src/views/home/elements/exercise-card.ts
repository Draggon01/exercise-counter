import {css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {ExerciseDto} from "../models/exerciseDto";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {selectCurrentUser} from "../../login/slice/userSlice";
import {UserDto} from "../../login/models/userDto";
import {CustomRouter} from "../../../index";
import {CheckDto} from "../models/checkDto";

@customElement("exercise-card")
export class ExerciseCard extends ConnectedLitElement {
    static styles = css`
        :host {
            width: 100%;
        }

        .card {
            position: relative;
            padding: 2px;
            width: 50%;
            min-height: 80px;
            margin: 2px auto;
            border-radius: 8px;
            display: grid;
            border: 1px solid teal;
            grid-template-rows: 0.5fr 1fr;
            min-width: 340px;
        }

        .headline {
            position: absolute;
            top: 0;
            left: 5px;
            max-width: 60%;
            padding: 8px;
            margin-top: 0;
            overflow: hidden;
            white-space: nowrap;
        }

        .options {
            width: 100%;
            display: grid;
            height: 100%;
            grid-template-columns: 1fr auto auto auto;
            min-height: 32px;
        }

        .buttonBar {
            display: grid;
            grid-template-columns: 1fr auto;
        }

        .element-box {
            margin: 12px;
            display: grid;
            grid-template-columns: max-content auto;
            gap: 8px;
        }

        .time-left {
            font-size: 0.85em;
            color: #888;
        }

        .time-left.urgent {
            color: #e06c1a;
        }

        .timer-section {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .timer-display {
            font-size: 1.4em;
            font-weight: bold;
            font-family: monospace;
            color: #333;
        }

        .timer-display.completed {
            color: #2e7d32;
        }

        .timer-controls {
            display: flex;
            gap: 6px;
        }

        .rep-section {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .rep-count {
            font-size: 1.1em;
            font-weight: bold;
            min-width: 60px;
            text-align: center;
        }
    `;

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
    private _timerRunning = false;

    @state()
    private _timerSecondsLeft = 0;

    @state()
    private _timerCompleted = false;

    @state()
    private _repsCompleted = 0;

    private _logLoaded = false;
    private _timerInterval?: ReturnType<typeof setInterval>;
    private _saveDebounce?: ReturnType<typeof setTimeout>;

    connectedCallback() {
        super.connectedCallback();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._timerInterval) clearInterval(this._timerInterval);
        if (this._saveDebounce) clearTimeout(this._saveDebounce);
    }

    updated(changedProperties: Map<string, unknown>) {
        if (changedProperties.has('item') && this.item.exerciseId && !this._logLoaded) {
            this._logLoaded = true;
            if (this._isTimeExercise()) {
                this._timerSecondsLeft = this._getTargetSeconds();
            }
            void this._loadLog();
        }
    }

    stateChanged(state: any) {
        this.user = selectCurrentUser(state);
    }

    private _isTimeExercise(): boolean {
        const t = this.item.exerciseType as string;
        return t === 'TIMEREPEAT' || t === 'TIMEINCREASE';
    }

    private _isRepExercise(): boolean {
        const t = this.item.exerciseType as string;
        return t === 'NUMBERREPEAT' || t === 'NUMBERINCREASE';
    }

    private _getTargetSeconds(): number {
        return parseInt(this.item.exerciseValue ?? '0', 10) || 0;
    }

    private _formatTime(totalSeconds: number): string {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    private _formatTodayValue(): string {
        if (!this.item.exerciseValue) return 'not Set';
        if (this._isTimeExercise()) {
            const secs = parseInt(this.item.exerciseValue, 10);
            return isNaN(secs) ? this.item.exerciseValue : this._formatTime(secs);
        }
        if (this._isRepExercise()) {
            return `${this.item.exerciseValue} reps`;
        }
        return this.item.exerciseValue;
    }

    private async _loadLog() {
        if (!this.item.exerciseId) return;
        try {
            const res = await fetch(`/api/log/${this.item.exerciseId}`, {credentials: 'include'});
            if (res.ok) {
                const data = await res.json();
                if (data.value != null) {
                    if (this._isTimeExercise()) {
                        const completed = Number(data.value);
                        this._timerSecondsLeft = Math.max(0, this._getTargetSeconds() - completed);
                        if (this._timerSecondsLeft === 0) this._timerCompleted = true;
                    } else if (this._isRepExercise()) {
                        this._repsCompleted = Number(data.value);
                    }
                }
            }
        } catch (_) { /* ignore */ }
    }

    private async _saveLog(value: number) {
        if (!this.item.exerciseId) return;
        try {
            await fetch('/api/log/save', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({exerciseId: this.item.exerciseId, value})
            });
        } catch (_) { /* ignore */ }
    }

    private _startTimer = () => {
        if (this._timerCompleted || this._timerRunning) return;
        this._timerRunning = true;
        this._timerInterval = setInterval(() => {
            this._timerSecondsLeft--;
            if (this._timerSecondsLeft <= 0) {
                this._timerSecondsLeft = 0;
                this._timerRunning = false;
                this._timerCompleted = true;
                clearInterval(this._timerInterval);
                this._playFinishSound();
                void this._saveLog(this._getTargetSeconds());
            }
        }, 1000);
    }

    private _pauseTimer = () => {
        this._timerRunning = false;
        clearInterval(this._timerInterval);
        void this._saveLog(this._getTargetSeconds() - this._timerSecondsLeft);
    }

    private _resetTimer = () => {
        this._timerRunning = false;
        this._timerCompleted = false;
        clearInterval(this._timerInterval);
        this._timerSecondsLeft = this._getTargetSeconds();
        void this._saveLog(0);
    }

    private _changeReps(delta: number) {
        this._repsCompleted = Math.max(0, this._repsCompleted + delta);
        if (this._saveDebounce) clearTimeout(this._saveDebounce);
        this._saveDebounce = setTimeout(() => void this._saveLog(this._repsCompleted), 500);
    }

    private _playFinishSound() {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx() as AudioContext;
        [0, 0.4, 0.8].forEach(offset => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
            gain.gain.setValueAtTime(0.5, ctx.currentTime + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
            osc.start(ctx.currentTime + offset);
            osc.stop(ctx.currentTime + offset + 0.35);
        });
    }

    private _renderTimerSection() {
        const target = this._getTargetSeconds();
        const isAtStart = this._timerSecondsLeft === target && !this._timerCompleted;
        return html`
            <div class="timer-section">
                <div class="timer-display ${this._timerCompleted ? 'completed' : ''}">
                    ${this._timerCompleted ? '✓ Done!' : this._formatTime(this._timerSecondsLeft)}
                </div>
                <div class="timer-controls">
                    ${this._timerCompleted ? html`
                        <sl-button size="small" variant="neutral" @click="${this._resetTimer}">Reset</sl-button>
                    ` : this._timerRunning ? html`
                        <sl-button size="small" variant="warning" @click="${this._pauseTimer}">⏸ Pause</sl-button>
                    ` : html`
                        <sl-button size="small" variant="primary" @click="${this._startTimer}">
                            ${isAtStart ? '▶ Start' : '▶ Resume'}
                        </sl-button>
                        ${!isAtStart ? html`
                            <sl-button size="small" variant="neutral"
                                       @click="${this._resetTimer}">Reset</sl-button>
                        ` : ''}
                    `}
                </div>
            </div>
        `;
    }

    private _renderRepSection() {
        const target = parseInt(this.item.exerciseValue ?? '0', 10);
        return html`
            <div class="rep-section">
                <sl-button size="small" variant="neutral"
                           @click="${() => this._changeReps(-1)}">−
                </sl-button>
                <span class="rep-count">${this._repsCompleted} / ${target}</span>
                <sl-button size="small" variant="neutral"
                           @click="${() => this._changeReps(1)}">+
                </sl-button>
            </div>
        `;
    }

    render() {
        return html`
            <div class="card">
                <h2 class="headline">${this.item.exerciseTitle}</h2>
                <div class="options">
                    <div></div>
                    ${this.user && this.user.username === this.item.creator ? html`
                        <sl-icon-button name="layer-backward" style="color: lightblue"
                                        @click="${this._hideClick}"></sl-icon-button>
                        <sl-icon-button name="pencil" @click="${this._editClick}"></sl-icon-button>
                        <sl-icon-button name="trash" style="color:red" @click="${this._trashClick}"></sl-icon-button>
                    ` : html`
                        <div></div>
                        <div></div>
                        <sl-icon-button name="layer-backward" style="color: lightblue"
                                        @click="${this._hideClick}"></sl-icon-button>
                    `}
                </div>
                <div class="element-box">
                    <div>Today's Value:</div>
                    <div style="font-weight: bold">${this._formatTodayValue()}</div>
                    ${this._isTimeExercise() ? html`
                        <div>Timer:</div>
                        <div>${this._renderTimerSection()}</div>
                    ` : this._isRepExercise() ? html`
                        <div>Progress:</div>
                        <div>${this._renderRepSection()}</div>
                    ` : ''}
                    <div>Finished By:</div>
                    <div>
                        ${this.finishedUser.map((check, idx) =>
                                check.user + "{" + check.streak + "}" + ((idx < this.finishedUser.length - 1) ? ", " : ""))}
                    </div>
                    <div>Time Left:</div>
                    <div class="${this._isUrgent() ? 'time-left urgent' : 'time-left'}">${this._getTimeLeft()}</div>
                </div>
                <div class="buttonBar">
                    <div>
                        <sl-button @click="${() => {
                            void CustomRouter.goto(`/statistics/` + this.item.exerciseId)
                        }}" style="padding:5px" variant="primary">Statistics
                        </sl-button>
                    </div>
                    <div style="align-content: center">
                        Finished
                        <sl-checkbox @sl-change="${this._checkChange}" ?checked=${this.checked}
                                     size="large"></sl-checkbox>
                    </div>
                </div>
            </div>
        `;
    }

    private _getTimeLeft(): string {
        const secs = this.item.timeLeftSeconds;
        if (secs == null) return '—';

        const totalHours = secs / 3600;
        const days = Math.floor(totalHours / 24);
        const hours = Math.floor(totalHours - days * 24);
        const minutes = Math.floor((secs - days * 24 * 3600 - hours * 3600) / 60);

        if (days >= 1) {
            return `${days} ${days === 1 ? 'Day' : 'Days'} and ${hours} ${hours === 1 ? 'Hour' : 'Hours'} left`;
        }
        if (hours >= 1) {
            return `${hours} ${hours === 1 ? 'Hour' : 'Hours'} left`;
        }
        return `${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'} left`;
    }

    private _isUrgent(): boolean {
        const secs = this.item.timeLeftSeconds;
        if (secs == null) return false;
        return secs < 6 * 60 * 60;
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
        this.dispatchEvent(new CustomEvent("checkChanged", {detail: e.target.checked}))
    }
}
