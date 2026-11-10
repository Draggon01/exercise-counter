import {css, html, LitElement, nothing, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {createRef, ref, Ref} from "lit/directives/ref.js";
import {keyed} from "lit/directives/keyed.js";
import {ExerciseDto} from "../models/exerciseDto";
import {ExerciseType, isIncreaseExercise, isTimeExercise} from "../../../utils/exercise";
import {validateForm} from "../../../utils/form";
import {formatDuration} from "../../../utils/format";
import type {SlInput, SlRadioGroup, SlSwitch} from "@shoelace-style/shoelace";

type Measure = "reps" | "time";
type Visibility = "PRIVATE" | "GROUPS" | "PUBLIC";

const VISIBILITY_HINT: Record<Visibility, string> = {
    PRIVATE: "Only you can see and add this exercise.",
    GROUPS: "Members of the selected groups can add this exercise.",
    PUBLIC: "Everybody can find this exercise in Browse.",
};

/** The four backend types are "what is counted" × "does the goal increase". */
export function toExerciseType(measure: Measure, increasing: boolean): ExerciseType {
    if (measure === "time") return increasing ? "TIMEINCREASE" : "TIMEREPEAT";
    return increasing ? "NUMBERINCREASE" : "NUMBERREPEAT";
}

/**
 * Create / edit an exercise. Emits `save` (detail: {@link ExerciseDto}) when the valid form is
 * submitted and `close` when the user cancels. The parent controls {@link open} and saves.
 */
@customElement("exercise-form-dialog")
export class ExerciseFormDialog extends LitElement {

    static styles = css`
        form {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        .row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--app-space-3);
        }

        .hint {
            margin: var(--app-space-1) 0 0;
            font-size: var(--sl-input-help-text-font-size-medium);
            color: var(--app-text-muted);
        }

        sl-radio-group::part(button-group),
        sl-radio-group::part(button-group__base) {
            width: 100%;
        }

        sl-radio-button {
            flex: 1;
        }

        @media (max-width: 480px) {
            .row {
                grid-template-columns: 1fr;
            }
        }
    `;

    @property({type: Boolean})
    open = false;

    /** The exercise to edit, or undefined to create a new one. */
    @property({attribute: false})
    exercise?: ExerciseDto;

    /** Names of the groups the user can share the exercise with. */
    @property({attribute: false})
    groups: string[] = [];

    @state()
    private measure: Measure = "reps";

    @state()
    private increasing = false;

    @state()
    private visibility: Visibility = "PRIVATE";

    /** Goal in seconds while editing a duration, for the "= 1:30" preview. */
    @state()
    private durationPreview = 0;

    /** Incremented on every opening so the form is rebuilt with fresh values. */
    private formKey = 0;

    private formRef: Ref<HTMLFormElement> = createRef();

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has("open") && this.open) {
            this.formKey++;
            const type = this.exercise?.exerciseType;
            this.measure = type && isTimeExercise(type) ? "time" : "reps";
            this.increasing = isIncreaseExercise(type);
            this.visibility = (this.exercise?.visibility as Visibility) ?? "PRIVATE";
            this.durationPreview = parseInt(this.exercise?.exerciseValue ?? "", 10) || 0;
        }
    }

    render() {
        return html`
            <sl-dialog label="${this.exercise ? "Edit exercise" : "New exercise"}"
                       .open="${this.open}"
                       @sl-request-close="${this.close}">
                ${this.open ? keyed(this.formKey, this.renderForm()) : nothing}
                <sl-button slot="footer" variant="default" @click="${this.close}">Cancel</sl-button>
                <sl-button slot="footer" variant="primary" @click="${this.save}">Save</sl-button>
            </sl-dialog>
        `;
    }

    private renderForm() {
        const exercise = this.exercise;
        const time = this.measure === "time";
        return html`
            <form ${ref(this.formRef)} @sl-hide="${(e: Event) => e.stopPropagation()}">
                <sl-input name="exerciseTitle" label="Name" placeholder="e.g. Push-ups" required
                          .value="${exercise?.exerciseTitle ?? ""}"></sl-input>

                <sl-radio-group name="measure" label="What do you count?" .value="${this.measure}"
                                @sl-change="${(e: Event) => this.measure = (e.target as SlRadioGroup).value as Measure}">
                    <sl-radio-button value="reps">Repetitions</sl-radio-button>
                    <sl-radio-button value="time">Duration</sl-radio-button>
                </sl-radio-group>

                <div>
                    <sl-input name="exerciseValue" type="number" min="1" required
                              label="${time ? "Goal per period (seconds)" : "Goal per period (repetitions)"}"
                              .value="${exercise?.exerciseValue ?? ""}"
                              @sl-input="${(e: Event) => this.durationPreview = Number((e.target as SlInput).value) || 0}"></sl-input>
                    ${time && this.durationPreview > 0
                            ? html`<p class="hint">= ${formatDuration(this.durationPreview)}</p>` : nothing}
                </div>

                <sl-switch name="increasing" .checked="${this.increasing}"
                           @sl-change="${(e: Event) => this.increasing = (e.target as SlSwitch).checked}">
                    Increase the goal after every period
                </sl-switch>
                ${this.increasing ? html`
                    <sl-input name="exerciseIncrease" type="number" min="1" required
                              label="${time ? "Increase by (seconds)" : "Increase by (repetitions)"}"
                              .value="${exercise?.exerciseIncrease ?? ""}"></sl-input>
                ` : nothing}

                <div class="row">
                    <sl-input name="startTime" type="time" label="Resets at" required
                              .value="${(exercise?.startTime ?? "23:59:00").slice(0, 5)}"></sl-input>
                    <sl-input name="daysRepeat" type="number" min="1" label="Every … days" required
                              .value="${String(exercise?.daysRepeat ?? 1)}"></sl-input>
                </div>

                <div>
                    <sl-radio-group name="visibility" label="Who can see it?" .value="${this.visibility}"
                                    @sl-change="${(e: Event) => this.visibility = (e.target as SlRadioGroup).value as Visibility}">
                        <sl-radio-button value="PRIVATE">Private</sl-radio-button>
                        <sl-radio-button value="GROUPS">Groups</sl-radio-button>
                        <sl-radio-button value="PUBLIC">Public</sl-radio-button>
                    </sl-radio-group>
                    <p class="hint">${VISIBILITY_HINT[this.visibility]}</p>
                </div>
                ${this.visibility === "GROUPS" ? html`
                    <sl-select name="groups" label="Groups" multiple clearable required
                               placeholder="${this.groups.length ? "Select groups" : "You are not in any group yet"}"
                               .value="${exercise?.groups ?? []}">
                        ${this.groups.map(group => html`<sl-option value="${group}">${group}</sl-option>`)}
                    </sl-select>
                ` : nothing}
            </form>
        `;
    }

    private save = () => {
        const form = this.formRef.value;
        if (!form || !validateForm(form)) {
            return;
        }
        const value = (name: string) => (form.querySelector(`[name="${name}"]`) as HTMLInputElement | null)?.value;
        const groups = form.querySelector('[name="groups"]') as unknown as { value: string[] } | null;
        const startTime = value("startTime") ?? "";

        const saved: ExerciseDto = {
            ...(this.exercise ?? {} as ExerciseDto),
            exerciseTitle: value("exerciseTitle") ?? "",
            exerciseType: toExerciseType(this.measure, this.increasing),
            exerciseValue: value("exerciseValue") ?? "",
            exerciseIncrease: this.increasing ? value("exerciseIncrease") ?? "" : "",
            // the backend expects HH:mm:ss, the time input gives HH:mm
            startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
            daysRepeat: Number(value("daysRepeat")),
            utcOffset: -new Date().getTimezoneOffset() / 60,
            visibility: this.visibility,
            groups: this.visibility === "GROUPS" && groups ? groups.value : [],
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
