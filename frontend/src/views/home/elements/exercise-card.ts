import {css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {ExerciseDto} from "../models/exerciseDto";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {selectCurrentUser} from "../../login/slice/userSlice";
import {UserDto} from "../../login/models/userDto";

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
        }

        .headline {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px;
            margin-top: 0;
        }

        .options {
            width: 100%;
            display: grid;
            height: 100%;
            grid-template-columns: 1fr auto auto;
        }

        .buttonBar {
            display: grid;
            grid-template-columns: 1fr auto;
        }
    `;

    @property()
    item: ExerciseDto = {
        exerciseId: "",
        exerciseTitle: "",
        creator: ""
    }

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
                    <sl-icon-button name="pencil" @click="${this._editClick}"></sl-icon-button>
                    ${this.user && this.user.username === this.item.creator ? html`
                        <sl-icon-button name="trash" style="color:red" @click="${this._trashClick}"></sl-icon-button>
                    ` : html`
                    `}
                </div>
                <div class="buttonBar">
                    <div>
                        <sl-button style="padding:5px" variant="primary">Statistics</sl-button>
                    </div>
                    <div style="align-content: center">
                        Finished
                        <sl-checkbox size="large"></sl-checkbox>
                    </div>
                </div>
            </div>
        `;
    }

    private _trashClick = () => {
        this.dispatchEvent(new CustomEvent("deleteExercise", {detail: this.item}))
    }

    private _editClick = () => {
        this.dispatchEvent(new CustomEvent("editExercise", {detail: this.item}))
    }
}