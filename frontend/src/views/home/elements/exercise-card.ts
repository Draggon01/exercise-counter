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

    connectedCallback() {
        super.connectedCallback();
    }

    stateChanged(state: any) {
        this.user = selectCurrentUser(state);
    }

    render() {
        return html`
            <div class="card">
                <h2 class="headline">${this.item.exerciseTitle}</h2>
                <div class="options">
                    <div></div>
                    ${this.user && this.user.username === this.item.creator ? html`
                        <sl-icon-button name="layer-backward" style="color: lightblue" @click="${this._hideClick}"></sl-icon-button>
                        <sl-icon-button name="pencil" @click="${this._editClick}"></sl-icon-button>
                        <sl-icon-button name="trash" style="color:red" @click="${this._trashClick}"></sl-icon-button>
                    ` : html`
                        <div></div>
                        <div></div>
                        <sl-icon-button name="layer-backward" style="color: lightblue" @click="${this._hideClick}"></sl-icon-button>
                    `}
                </div>
                <div class="element-box">
                    <div>Today's Value:</div>
                    <div style="font-weight: bold"> ${this.item.exerciseValue ?? "not Set"}</div>
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

        if (days >= 1) {
            return `${days} ${days === 1 ? 'Day' : 'Days'} left`;
        }
        const hours = Math.floor(totalHours);
        return `${hours} ${hours === 1 ? 'Hour' : 'Hours'} left`;
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