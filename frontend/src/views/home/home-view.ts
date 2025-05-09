import {css, html} from 'lit';
import {createRef, Ref, ref} from 'lit/directives/ref.js';
import {customElement, state} from "lit/decorators.js";
import {RootState, store} from '../../store';
import {ConnectedLitElement} from "../../connectedLitElement";
import {
    deleteExercise,
    listExercises,
    saveExercise,
    selectAllExercises
} from './slice/exerciseSlice';
import {ExerciseDto} from "./models/exerciseDto";
import './elements/exercise-card'
import {UserDto} from '../login/models/userDto';
import {selectCurrentUser} from "../login/slice/userSlice";
import {CheckDto} from "./models/checkDto";
import {deleteCheck, listChecks, saveCheck, selectAllChecks} from "./slice/checkSlice";

@customElement("home-view")
export class HomeView extends ConnectedLitElement {
    @state()
    private openDialog = false;

    @state()
    private exerciseDto: ExerciseDto = {} as ExerciseDto;

    @state()
    private listExercises: ExerciseDto[] = []

    @state()
    private listChecks: CheckDto[] = []

    @state()
    private user?: UserDto;

    formRef: Ref<HTMLFormElement> = createRef();

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
        store.dispatch(listChecks())
    }

    stateChanged(state: RootState) {
        this.listExercises = selectAllExercises(state);
        this.listChecks = selectAllChecks(state);
        this.user = selectCurrentUser(state);
    }

    render() {
        return html`
            <div>
                <sl-button class="addButton" variant="primary" @click="${() => {
                    this.openDialog = true;
                    this.exerciseDto = {
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
        if (!this.exerciseDto) {
            return html``;
        } else {
            return html`
                <form ${ref(this.formRef)}>
                    <sl-input name="exerciseTitle"
                              label="Exercise Name"
                              .value="${this.exerciseDto.exerciseTitle ?? ""}"
                              required
                    ></sl-input>
                    <sl-input name="startTime"
                              label="Cycle Time"
                              .value="${this.exerciseDto.startTime ?? ""}"
                              pattern="^([0-2][0-3]|[0-1][0-9]):[0-5][0-9]:[0-5][0-9]$"
                              placeholder="00:00:00"
                              required
                    ></sl-input>
                    <sl-input name="daysRepeat"
                              label="Cycle Days"
                              .value="${this.exerciseDto.daysRepeat ?? 1}"
                              type="number"
                              required></sl-input>
                </form>
                <sl-button slot="footer" variant="danger" @click="${() => {
                    this.exerciseDto!.exerciseTitle = "";
                    this.openDialog = false;
                }}">
                    Close
                </sl-button>
                <sl-button slot="footer" variant="primary" @click="${() => {
                    this.handleEditExercise()
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
                            .checked="${this.getChecked(element)}"
                            @deleteExercise="${(e: any) => {
                                store.dispatch(deleteExercise(e.detail))
                            }}"
                            @editExercise="${(e: any) => {
                                this.exerciseDto = {
                                    exerciseId: e.detail.exerciseId,
                                    exerciseTitle: e.detail.exerciseTitle,
                                    creator: e.detail.creator,
                                    startTime: e.detail.startTime,
                                    daysRepeat: e.detail.daysRepeat,
                                } as ExerciseDto;
                                this.openDialog = true;
                            }}"
                            @checkChanged="${(e: any) => {
                                let check = e.detail;
                                if (check) {
                                    store.dispatch(saveCheck({exerciseId: element.exerciseId}))
                                } else {
                                    store.dispatch(deleteCheck({exerciseId: element.exerciseId}))
                                }
                            }}"
                    ></exercise-card>`;
            })}
        `;
    }

    private handleEditExercise() {
        this.formRef.value!.childNodes.forEach(child => {
            if (Object.prototype.hasOwnProperty.call(child, 'reportValidity') && typeof (child as any).reportValidity === 'function') {
                (child as any).reportValidity();
            }
        })
        if (this.formRef.value!.checkValidity()) {
            //all fields should be fine
            let formData = new FormData(this.formRef.value!);
            this.exerciseDto.exerciseTitle = formData.get("exerciseTitle")!.toString();
            this.exerciseDto.daysRepeat = +formData.get("daysRepeat")!;
            this.exerciseDto.startTime = formData.get("startTime")!.toString();
            this.exerciseDto.utcOffset = -new Date().getTimezoneOffset() / 60
            store.dispatch(saveExercise(this.exerciseDto!));
            this.exerciseDto = {} as ExerciseDto
            this.openDialog = false;
        } else {
            this.formRef.value!.reportValidity();
        }
    }

    private getChecked(element: ExerciseDto) {
        let check = this.listChecks.find(check => check.exerciseId === element.exerciseId);
        return !!check;
    }
}