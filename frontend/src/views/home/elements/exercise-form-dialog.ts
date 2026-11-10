import {html, LitElement, nothing, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {createRef, ref, Ref} from "lit/directives/ref.js";
import {keyed} from "lit/directives/keyed.js";
import {ExerciseDto} from "../models/exerciseDto";
import {isIncreaseExercise, isTimeExercise} from "../../../utils/exercise";
import {validateForm} from "../../../utils/form";

/** Matches HH:mm:ss from 00:00:00 to 23:59:59. */
const TIME_PATTERN = "^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$";

/**
 * Create / edit an exercise. Emits `save` (detail: {@link ExerciseDto}) when the valid form is
 * submitted and `close` when the user cancels. The parent controls {@link open} and saves.
 */
@customElement("exercise-form-dialog")
export class ExerciseFormDialog extends LitElement {

    @property({type: Boolean})
    open = false;

    /** The exercise to edit, or undefined to create a new one. */
    @property({attribute: false})
    exercise?: ExerciseDto;

    /** Exercise type → description (from the backend). */
    @property({attribute: false})
    exerciseTypes: Record<string, string> = {};

    @property({attribute: false})
    visibilities: string[] = [];

    /** Names of the groups the user can share the exercise with. */
    @property({attribute: false})
    groups: string[] = [];

    @state()
    private currentType = "";

    @state()
    private currentVisibility = "";

    /** Incremented on every opening so the form is rebuilt with fresh values. */
    private formKey = 0;

    private formRef: Ref<HTMLFormElement> = createRef();

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has("open") && this.open) {
            this.formKey++;
            this.currentType = this.exercise?.exerciseType ?? "";
            this.currentVisibility = this.exercise?.visibility ?? "";
        }
    }

    render() {
        return html`
            <sl-dialog label="${this.exercise ? "Edit Exercise" : "Add Exercise"}"
                       .open="${this.open}"
                       @sl-request-close="${this.close}">
                ${this.open ? keyed(this.formKey, this.renderForm()) : nothing}
                <sl-button slot="footer" variant="default" @click="${this.close}">Close</sl-button>
                <sl-button slot="footer" variant="primary" @click="${this.save}">Save</sl-button>
            </sl-dialog>
        `;
    }

    private renderForm() {
        const exercise = this.exercise;
        return html`
            <form ${ref(this.formRef)} @sl-hide="${(e: Event) => e.stopPropagation()}">
                <sl-input name="exerciseTitle" label="Exercise Name"
                          .value="${exercise?.exerciseTitle ?? ""}" required></sl-input>
                <sl-select name="exerciseType" label="Exercise Type" required
                           .value="${this.currentType}"
                           @sl-change="${(e: Event) => this.currentType = (e.target as HTMLInputElement).value}">
                    ${Object.entries(this.exerciseTypes).map(([key, description]) => html`
                        <sl-option value="${key}">${description}</sl-option>
                    `)}
                </sl-select>
                ${this.renderTypeFields()}
                <sl-input name="startTime" label="Refresh Time" placeholder="00:00:00" required
                          pattern="${TIME_PATTERN}"
                          .value="${exercise?.startTime ?? "23:59:00"}"></sl-input>
                <sl-input name="daysRepeat" label="Cycle Days" type="number" required
                          .value="${String(exercise?.daysRepeat ?? 1)}"></sl-input>
                <sl-select name="visibility" label="Visibility" required
                           .value="${this.currentVisibility}"
                           @sl-change="${(e: Event) => this.currentVisibility = (e.target as HTMLInputElement).value}">
                    ${this.visibilities.map(visibility => html`
                        <sl-option value="${visibility}">${visibility}</sl-option>
                    `)}
                </sl-select>
                ${this.currentVisibility === "GROUPS" ? html`
                    <sl-select name="groups" label="Select Groups" multiple clearable
                               .value="${exercise?.groups ?? []}">
                        ${this.groups.map(group => html`<sl-option value="${group}">${group}</sl-option>`)}
                    </sl-select>
                ` : nothing}
            </form>
        `;
    }

    /** Value field for every type, plus the increase field for *INCREASE types. */
    private renderTypeFields() {
        if (!this.currentType) {
            return nothing;
        }
        const time = isTimeExercise(this.currentType);
        return html`
            <sl-input name="exerciseValue" type="number"
                      label="${time ? "Duration :" : "Repetitions :"}"
                      .value="${this.exercise?.exerciseValue ?? ""}"></sl-input>
            ${isIncreaseExercise(this.currentType) ? html`
                <sl-input name="exerciseIncrease" type="number"
                          label="${time ? "Duration increase :" : "Repetition increase :"}"
                          .value="${this.exercise?.exerciseIncrease ?? ""}"></sl-input>
            ` : nothing}
        `;
    }

    private save = () => {
        const form = this.formRef.value;
        if (!form || !validateForm(form)) {
            return;
        }
        const value = (name: string) => (form.querySelector(`[name="${name}"]`) as HTMLInputElement | null)?.value;
        const groups = form.querySelector('[name="groups"]') as unknown as { value: string[] } | null;

        const saved: ExerciseDto = {
            ...(this.exercise ?? {} as ExerciseDto),
            exerciseTitle: value("exerciseTitle") ?? "",
            exerciseType: this.currentType,
            // fields that are not shown for the type keep their previous value
            exerciseValue: value("exerciseValue") ?? this.exercise?.exerciseValue ?? "",
            exerciseIncrease: value("exerciseIncrease") ?? this.exercise?.exerciseIncrease ?? "",
            startTime: value("startTime") ?? "",
            daysRepeat: Number(value("daysRepeat")),
            utcOffset: -new Date().getTimezoneOffset() / 60,
            visibility: this.currentVisibility,
            groups: groups ? groups.value : [],
        };
        this.dispatchEvent(new CustomEvent<ExerciseDto>("save", {detail: saved}));
    }

    private close = () => {
        this.dispatchEvent(new CustomEvent("close"));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-form-dialog": ExerciseFormDialog;
    }
}
