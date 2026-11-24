import {css, html, LitElement, nothing, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {repeat} from "lit/directives/repeat.js";
import type {SlCheckbox} from "@shoelace-style/shoelace";
import {fullscreenDialogStyles} from "../../../styles/dialog";
import {touchStyles} from "../../../styles/touch";
import {formatTarget} from "../../../utils/format";
import {applyOrder, shuffle} from "../../../utils/guided-workout";
import {getWorkoutSetup, setWorkoutSetup} from "../../../utils/preferences";
import {moveItem} from "../../../utils/reorder";
import {SortableController} from "../../../utils/sortable";
import {ExerciseStepDto, GuidedMode} from "../models/exerciseDetailsDto";
import "../../home/elements/exercise-sort-controls";

/**
 * Before a guided workout: order of the steps and which to leave out. Own choices are kept on this device (not the
 * order if the creator chose "shuffled": that is a new one every time). Events: `start-workout` (detail: the steps)
 * and `cancel`.
 */
@customElement("workout-dialog")
export class WorkoutDialog extends LitElement {

    static styles = [fullscreenDialogStyles, touchStyles, css`
        .steps {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-2);
        }

        .step {
            display: flex;
            align-items: center;
            gap: var(--app-space-2);
            padding: var(--app-space-1) var(--app-space-3);
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius);
            background: var(--app-surface);
        }

        .step[dragging] {
            position: relative;
            z-index: 5;
            border-color: var(--app-accent);
            box-shadow: var(--app-shadow-raised);
        }

        sl-checkbox {
            flex: 1;
            min-width: 0;
            overflow-wrap: anywhere;
        }

        .target {
            font-size: 0.85em;
            color: var(--app-text-muted);
        }

        .skipped {
            color: var(--app-text-muted);
        }

        .tools {
            display: flex;
            flex-wrap: wrap;
            gap: var(--app-space-2);
            margin-bottom: var(--app-space-3);
        }
    `];

    @property({type: Boolean})
    open = false;

    @property()
    exerciseId = "";

    /** In the creator's order. */
    @property({attribute: false})
    steps: ExerciseStepDto[] = [];

    @property()
    mode: GuidedMode = "ORDERED";

    @state()
    private ordered: ExerciseStepDto[] = [];

    @state()
    private skipped: string[] = [];

    private sortable = new SortableController(this, {
        items: ".step",
        move: (from, to) => this.move(from, to),
    });

    protected willUpdate(changed: PropertyValues<this>) {
        if (!changed.has("open") || !this.open) return;
        const setup = getWorkoutSetup(this.exerciseId);
        this.ordered = this.mode === "SHUFFLED" ? shuffle(this.steps) : applyOrder(this.steps, setup.order);
        this.skipped = setup.skipped;
    }

    render() {
        return html`
            <sl-dialog label="Guided workout" .open="${this.open}" @sl-request-close="${this.cancel}">
                ${this.open ? this.renderSteps() : nothing}
                <sl-button slot="footer" @click="${this.cancel}">Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?disabled="${this.chosen.length === 0}" @click="${this.start}">
                    ▶ Start
                </sl-button>
            </sl-dialog>
        `;
    }

    private renderSteps() {
        const sortable = this.ordered.length > 1;
        return html`
            ${sortable ? html`
                <div class="tools">
                    <sl-button size="small" @click="${() => this.ordered = shuffle(this.ordered)}">
                        <sl-icon slot="prefix" name="shuffle"></sl-icon>
                        Shuffle
                    </sl-button>
                    ${this.isCreatorsOrder ? nothing : html`
                        <sl-button size="small" variant="text" @click="${() => this.ordered = [...this.steps]}">
                            Original order
                        </sl-button>`}
                </div>` : nothing}
            <div class="steps" @pointerdown="${this.sortable.start}">
                ${repeat(this.ordered, step => step.stepId, (step, i) => {
                    const target = formatTarget(step);
                    const skip = this.skipped.includes(step.stepId);
                    return html`
                        <div class="step">
                            <sl-checkbox .checked="${!skip}" @sl-change="${(e: Event) => this.choose(step, (e.target as SlCheckbox).checked)}">
                                <span class="${skip ? "skipped" : ""}">${step.title}</span>
                                ${target ? html`<div class="target">${target}</div>` : nothing}
                            </sl-checkbox>
                            ${sortable ? html`
                                <exercise-sort-controls @move-up="${() => this.move(i, i - 1)}"
                                                        @move-down="${() => this.move(i, i + 1)}"></exercise-sort-controls>
                            ` : nothing}
                        </div>`;
                })}
            </div>
        `;
    }

    private get chosen() {
        return this.ordered.filter(step => !this.skipped.includes(step.stepId));
    }

    private get isCreatorsOrder() {
        return this.ordered.every((step, i) => step.stepId === this.steps[i]?.stepId);
    }

    private choose(step: ExerciseStepDto, chosen: boolean) {
        const others = this.skipped.filter(id => id !== step.stepId);
        this.skipped = chosen ? others : [...others, step.stepId];
    }

    private async move(from: number, to: number) {
        if (to < 0 || to >= this.ordered.length) return;
        this.ordered = moveItem(this.ordered, from, to);
    }

    private start = () => {
        setWorkoutSetup(this.exerciseId, {
            order: this.mode === "SHUFFLED" || this.isCreatorsOrder ? undefined : this.ordered.map(step => step.stepId),
            skipped: this.skipped.filter(id => this.steps.some(step => step.stepId === id)),
        });
        this.dispatchEvent(new CustomEvent<ExerciseStepDto[]>("start-workout", {detail: this.chosen}));
    }

    private cancel = (e: Event) => {
        if (e.type === "sl-request-close" && e.target !== e.currentTarget) return;
        this.dispatchEvent(new CustomEvent("cancel"));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "workout-dialog": WorkoutDialog;
    }
}
