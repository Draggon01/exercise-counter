import {css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {ExerciseDto} from "../models/exerciseDto";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {RootState} from '../../../store';

@customElement("browse-card")
export class BrowseCard extends ConnectedLitElement {
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
            left: 50%;
            max-width: 50%;
            transform: translateX(-50%);
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
    `;

    stateChanged(state: RootState): void {
    }

    @property()
    item: ExerciseDto = {
        exerciseId: "",
        exerciseTitle: "",
        creator: ""
    } as ExerciseDto


    connectedCallback() {
        super.connectedCallback();
    }

    render() {
        return html`
            <div class="card">
                <h2 class="headline">${this.item.exerciseTitle}</h2>
                <div class="buttonBar">
                    <div>
                        <sl-button @click="${() => {
                            this._selectClick()
                        }}" style="padding:5px" variant="primary">Select
                        </sl-button>
                    </div>
                </div>
            </div>
        `;
    }

    private _selectClick = () => {
        this.dispatchEvent(new CustomEvent("selectClick", {detail: this.item}))
    }
}