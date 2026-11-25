import {css, html, LitElement, nothing, PropertyValues} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";
import type {SlRadioGroup} from "@shoelace-style/shoelace";
import {fullscreenDialogStyles} from "../../../styles/dialog";
import {touchStyles} from "../../../styles/touch";
import {validateForm} from "../../../utils/form";
import {ExerciseStepDto, ExerciseStepRequest} from "../models/exerciseDetailsDto";

type Measure = "none" | "reps" | "time";

const optionalNumber = (value: string | undefined) => value === undefined || value === "" ? null : Number(value);

/**
 * Dialog to add or edit a step. Events: `save-step` (detail: {@link ExerciseStepRequest}) and `cancel`; the parent
 * saves and closes it.
 */
@customElement("step-dialog")
export class StepDialog extends LitElement {

    static styles = [fullscreenDialogStyles, touchStyles, css`
        form {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        .row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
            gap: var(--app-space-3);
        }

        sl-radio-group::part(button-group),
        sl-radio-group::part(button-group__base) {
            width: 100%;
        }

        /* large text */
        sl-radio-group::part(button-group__base) {
            flex-wrap: wrap;
        }

        sl-radio-button {
            flex: 1;
        }
    `];

    @property({type: Boolean})
    open = false;

    /** The step to edit; undefined to add one. */
    @property({attribute: false})
    step?: ExerciseStepDto;

    @property({type: Boolean})
    saving = false;

    @state()
    private measure: Measure = "none";

    @query("form")
    private form?: HTMLFormElement;

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has("open") && this.open) {
            this.measure = this.step?.reps != null ? "reps" : this.step?.durationSeconds != null ? "time" : "none";
        }
    }

    render() {
        return html`
            <sl-dialog label="${this.step ? "Edit step" : "Add step"}" .open="${this.open}"
                       @sl-request-close="${this.cancel}">
                ${this.open ? this.renderForm() : nothing}
                <sl-button slot="footer" @click="${this.cancel}">Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?loading="${this.saving}" @click="${this.save}">Save</sl-button>
            </sl-dialog>
        `;
    }

    private renderForm() {
        const step = this.step;
        const text = (value?: number | null) => value == null ? "" : String(value);
        return html`
            <form @submit="${(e: Event) => { e.preventDefault(); this.save(); }}">
                <sl-input name="title" label="Title" placeholder="e.g. Wall sit" required maxlength="80"
                          .value="${step?.title ?? ""}"></sl-input>
                <sl-radio-group label="How much?" .value="${this.measure}"
                                @sl-change="${(e: Event) => this.measure = (e.target as SlRadioGroup).value as Measure}">
                    <sl-radio-button value="none">No limit</sl-radio-button>
                    <sl-radio-button value="reps">Reps</sl-radio-button>
                    <sl-radio-button value="time">Time</sl-radio-button>
                </sl-radio-group>
                <div class="row">
                    <sl-input name="sets" type="number" inputmode="numeric" min="1" max="99" label="Sets"
                              .value="${text(step?.sets)}"></sl-input>
                    ${this.measure === "reps" ? html`
                        <sl-input name="reps" type="number" inputmode="numeric" min="1" max="999" label="Reps" required
                                  .value="${text(step?.reps)}"></sl-input>` : nothing}
                    ${this.measure === "time" ? html`
                        <sl-input name="durationSeconds" type="number" inputmode="numeric" min="1" max="3600"
                                  label="Seconds" required .value="${text(step?.durationSeconds)}"></sl-input>` : nothing}
                    <sl-input name="restSeconds" type="number" inputmode="numeric" min="0" max="600" label="Rest (s)"
                              .value="${text(step?.restSeconds)}"></sl-input>
                </div>
                <sl-textarea name="hints" label="Hints" placeholder="e.g. Back flat, knees over the ankles" rows="3"
                             maxlength="500" .value="${step?.hints ?? ""}"></sl-textarea>
            </form>
        `;
    }

    private save = () => {
        if (!this.form || this.saving || !validateForm(this.form)) return;
        const value = (name: string) =>
            (this.form!.querySelector(`[name="${name}"]`) as HTMLInputElement | null)?.value;
        const detail: ExerciseStepRequest = {
            title: (value("title") ?? "").trim(),
            hints: (value("hints") ?? "").trim(),
            sets: optionalNumber(value("sets")),
            reps: optionalNumber(value("reps")),
            durationSeconds: optionalNumber(value("durationSeconds")),
            restSeconds: optionalNumber(value("restSeconds")),
        };
        this.dispatchEvent(new CustomEvent<ExerciseStepRequest>("save-step", {detail}));
    }

    /** Also for selects etc. inside: only the dialog's own close request counts. */
    private cancel = (e: Event) => {
        if (e.type === "sl-request-close" && e.target !== e.currentTarget) return;
        this.dispatchEvent(new CustomEvent("cancel"));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "step-dialog": StepDialog;
    }
}
