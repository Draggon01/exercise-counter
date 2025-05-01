import {css, html} from 'lit';
import {customElement, state} from "lit/decorators.js";
import {RootState, store} from '../../store';
import {ConnectedLitElement} from "../../connectedLitElement";
import {listExercises, saveExercise, selectAllExercises} from './slice/exerciseSlice';
import {ExerciseDto} from "./models/exerciseDto";

@customElement("home-view")
export class HomeView extends ConnectedLitElement {
    @state()
    private openDialog = false;

    @state()
    private newExercise = "";

    @state()
    private listExercises: ExerciseDto[] = []

    static styles = css`
        :host {
            position: relative;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        }

        .addButton {
            margin-top: 1rem;
        }

    `

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(listExercises());
    }

    stateChanged(state: RootState) {
        this.listExercises = selectAllExercises(state);
    }

    render() {
        return html`
            <div>
                <sl-button class="addButton" variant="primary" @click="${() => {
                    this.openDialog = true;
                }}">
                    Add Exercises
                </sl-button>
            </div>
            ${this.listExercises.map((element) => {
                return html`
                    <div>${element.exerciseTitle}</div>`;
            })}

            <sl-dialog .open="${this.openDialog}"
                       @sl-hide="${() => this.openDialog = false}"
                       label="Exercise Form">
                <sl-input label="Exercise Name"
                          .value="${this.newExercise}"
                          @sl-input="${(e: any) => {
                              this.newExercise = e.target.value ?? "";
                          }}"
                ></sl-input>
                <sl-button slot="footer" variant="danger" @click="${() => {
                    this.newExercise = "";
                    this.openDialog = false;
                }}">
                    Close
                </sl-button>
                <sl-button slot="footer" variant="primary" @click="${() => {
                    store.dispatch(saveExercise(
                            {
                                exerciseTitle: this.newExercise
                            } as ExerciseDto
                    ));
                    this.newExercise = "";
                    this.openDialog = false;
                }}">Add
                </sl-button>
            </sl-dialog>
        `;
    }
}