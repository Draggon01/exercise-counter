import {css, html} from 'lit';
import {customElement, state} from "lit/decorators.js";
import {RootState, store} from '../../store';
import {ConnectedLitElement} from "../../connectedLitElement";
import {deleteExercise, listExercises, saveExercise, selectAllExercises} from './slice/exerciseSlice';
import {ExerciseDto} from "./models/exerciseDto";
import './elements/exercise-card'
import { UserDto } from '../login/models/userDto';
import {selectCurrentUser} from "../login/slice/userSlice";

@customElement("home-view")
export class HomeView extends ConnectedLitElement {
    @state()
    private openDialog = false;

    @state()
    private newExercise?: ExerciseDto;

    @state()
    private listExercises: ExerciseDto[] = []

    @state()
    private user?: UserDto;

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
        this.user = selectCurrentUser(state);
    }

    render() {
        return html`
            <div>
                <sl-button class="addButton" variant="primary" @click="${() => {
                    this.openDialog = true;
                    this.newExercise = {
                        exerciseTitle: "",
                        creator: this.user!.username
                    } as ExerciseDto;
                }}">
                    Add Exercise
                </sl-button>
            </div>
            ${this.renderItems()}
            <sl-dialog .open="${this.openDialog}"
                       @sl-hide="${() => this.openDialog = false}"
                       label="Exercise Form">
                ${this.renderEditExercise()}
            </sl-dialog>

        `;
    }

    private renderEditExercise() {
        if (!this.newExercise) {
            return html``;
        } else {
            return html`
                <sl-input label="Exercise Name"
                          .value="${this.newExercise.exerciseTitle!}"
                          @sl-input="${(e: any) => {
                              this.newExercise!.exerciseTitle = e.target.value ?? "";
                          }}"
                ></sl-input>
                <sl-button slot="footer" variant="danger" @click="${() => {
                    this.newExercise!.exerciseTitle = "";
                    this.openDialog = false;
                }}">
                    Close
                </sl-button>
                <sl-button slot="footer" variant="primary" @click="${() => {
                    store.dispatch(saveExercise(this.newExercise!));
                    this.newExercise = {
                        exerciseTitle: ""
                    } as ExerciseDto;
                    this.openDialog = false;
                }}">
                    Add
                </sl-button>
            `
        }
    }

    private renderItems() {
        return html`
            ${this.listExercises.map((element) => {
                return html`
                    <exercise-card
                            .item="${element}"
                            @deleteExercise="${(e: any) => {
                                store.dispatch(deleteExercise(e.detail))
                            }}"
                            @editExercise="${(e: any) => {
                                this.newExercise = {
                                    exerciseId: e.detail.exerciseId,
                                    exerciseTitle: e.detail.exerciseTitle,
                                    creator: e.detail.exerciseCreator,
                                } as ExerciseDto;
                                this.openDialog = true;
                            }}"
                    ></exercise-card>`;
            })}
        `;
    }
}