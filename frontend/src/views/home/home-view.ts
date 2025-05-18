import {css, html, TemplateResult} from 'lit';
import {createRef, Ref, ref} from 'lit/directives/ref.js';
import {customElement, state} from "lit/decorators.js";
import {RootState, store} from '../../store';
import {ConnectedLitElement} from "../../connectedLitElement";
import {deleteExercise, listExercises, saveExercise, selectAllExercises} from './slice/exerciseSlice';
import {ExerciseDto} from "./models/exerciseDto";
import './elements/exercise-card'
import {UserDto} from '../login/models/userDto';
import {selectCurrentUser} from "../login/slice/userSlice";
import {CheckDto} from "./models/checkDto";
import {
    deleteCheck,
    listChecksPerExercise,
    listUserChecks,
    saveCheck,
    selectAllChecks, selectChecksPerExercise
} from "./slice/checkSlice";

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

    @state()
    private exerciseTypes: Record<string, string> = {};

    @state()
    private currentType: string = "";

    @state()
    private openWarningDialog = false;

    @state()
    private exerciseToDelete?: ExerciseDto;

    @state()
    private checks: Record<string, CheckDto[]> = {}

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
        store.dispatch(listUserChecks())
        store.dispatch(listChecksPerExercise());

        fetch("/api/exercises/exercisetype", {
            method: 'GET',
            credentials: "include"
        }).then(response => response.json())
            .then(response => this.exerciseTypes = response)
    }

    stateChanged(state: RootState) {
        this.listExercises = selectAllExercises(state);
        this.listChecks = selectAllChecks(state);
        this.user = selectCurrentUser(state);
        this.checks = selectChecksPerExercise(state);
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
            <sl-dialog .open="${this.openWarningDialog}"
                       @sl-hide="${() => {
                           this.openWarningDialog = false
                           this.exerciseToDelete = undefined;
                       }}"
                       label="Warning">
                ${this.renderWarningDialog()}
            </sl-dialog>

        `;
    }

    private renderWarningDialog() {
        return html`
            <p>
                You are about to delete this exercise.
                This action cannot be undone.
                Are you sure you want to proceed?
            </p>
            <sl-button slot="footer" variant="primary" @click="${() => {
                this.openWarningDialog = false;
                this.exerciseToDelete = undefined;
            }}"> Close
            </sl-button>
            <sl-button slot="footer" variant="danger" @click="${() => {
                this.openWarningDialog = false;
                if (this.exerciseToDelete) {
                    store.dispatch(deleteExercise(this.exerciseToDelete));
                }
                this.exerciseToDelete = undefined;
            }}">
                Delete Exercise
            </sl-button>
        `
    }

    private renderEditExercise() {
        if (!this.exerciseDto) {
            return html``;
        } else {
            return html`
                <form ${ref(this.formRef)} @sl-hide="${(e: any) => e.stopPropagation()}">
                    <sl-input name="exerciseTitle"
                              label="Exercise Name"
                              .value="${this.exerciseDto.exerciseTitle ?? ""}"
                              required
                    ></sl-input>
                    <sl-select name="exerciseType"
                               label="Exercise Type"
                               .value="${this.currentType ?? ""}"
                               required
                               @sl-change="${(e: any) => this.currentType = e.target.value}"
                    >
                        ${Object.entries(this.exerciseTypes).map(([key, value]) => {
                            return html`
                                <sl-option value="${key}">${value}</sl-option>
                            `
                        })}
                    </sl-select>
                    ${this.renderOptionsForType(this.currentType)}
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
            ${this.listExercises.sort((a, b) =>
                    a.exerciseTitle.localeCompare(b.exerciseTitle))
                    .map((element) => {
                        return html`
                            <exercise-card
                                    .item="${element}"
                                    .checked="${this.getChecked(element)}"
                                    .finishedUser="${this.checks[element.exerciseId] ?? []}"
                                    @deleteExercise="${(e: any) => {
                                        this.exerciseToDelete = e.detail;
                                        this.openWarningDialog = true;
                                    }}"
                                    @editExercise="${(e: any) => {
                                        this.exerciseDto = {
                                            exerciseId: e.detail.exerciseId,
                                            exerciseTitle: e.detail.exerciseTitle,
                                            creator: e.detail.creator,
                                            startTime: e.detail.startTime,
                                            daysRepeat: e.detail.daysRepeat,
                                            exerciseType: e.detail.exerciseType,
                                            exerciseValue: e.detail.exerciseValue,
                                            exerciseIncrease: e.detail.exerciseIncrease,
                                        } as ExerciseDto;
                                        this.currentType = e.detail.exerciseType;
                                        this.openDialog = true;
                                    }}"
                                    @checkChanged="${async (e: any) => {
                                        let check = e.detail;
                                        if (check) {
                                            await store.dispatch(saveCheck({
                                                exerciseId: element.exerciseId,
                                                user: "checked by Backend"
                                            }))
                                        } else {
                                            await store.dispatch(deleteCheck({
                                                exerciseId: element.exerciseId,
                                                user: "checked by Backend"
                                            }))
                                        }
                                        store.dispatch(listChecksPerExercise());
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
            this.exerciseDto.exerciseType = formData.get("exerciseType")!.toString();
            if (formData.has("exerciseValue")) {
                this.exerciseDto.exerciseValue = formData.get("exerciseValue")!.toString();
            }
            if (formData.has("exerciseIncrease")) {
                this.exerciseDto.exerciseIncrease = formData.get("exerciseIncrease")!.toString();
            }
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

    private renderOptionsForType(currentType: string) {
        switch (currentType) {
            case "NUMBERREPEAT":
            case "TIMEREPEAT":
                return this.renderFields(this.renderValueField());
            case "NUMBERINCREASE":
            case "TIMEINCREASE":
                return this.renderFields(this.renderValueField(), this.renderIncreaseField());
            default:
                return html`not implemented type`;
        }
    }

    private renderValueField(time: boolean = false) {
        return html`
            <sl-input name="exerciseValue"
                      label="Exercise Value ${time ? "in seconds" : "in repetitions"}"
                      .value="${this.exerciseDto.exerciseValue ?? ""}"
                      type="number"
            ></sl-input>`
    }

    private renderIncreaseField(time: boolean = false) {
        return html`
            <sl-input name="exerciseIncrease"
                      label="PeriodExercise ${time ? "time increase in seconds" : "repetition increase"}"
                      .value="${this.exerciseDto.exerciseIncrease ?? ""}"
                      type="number"
            ></sl-input>`
    }

    private renderFields(...fields: TemplateResult[]) {
        return html`
            ${fields.map(field => field)}
        `
    }
}