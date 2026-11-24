import {css, html, LitElement, nothing} from "lit";
import {customElement, property} from "lit/decorators.js";
import {ExerciseDto} from "../models/exerciseDto";
import {exerciseTarget, isRepExercise, isTimeExercise, progressPercent} from "../../../utils/exercise";
import "./exercise-timer";
import "./rep-counter";

/**
 * Timer or rep counter (with progress bar) of an exercise. Emits `progress-changed` (detail: seconds / reps done),
 * the parent saves it.
 */
@customElement("exercise-progress")
export class ExerciseProgress extends LitElement {

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-2);
        }

        sl-progress-bar {
            --height: 6px;
            --indicator-color: var(--app-accent);
        }

        sl-progress-bar.done {
            --indicator-color: var(--app-success);
        }
    `;

    @property({attribute: false})
    item!: ExerciseDto;

    /** Seconds or reps done in the current period. */
    @property({type: Number})
    value = 0;

    /** Marked as done: green progress bar. */
    @property({type: Boolean})
    done = false;

    /**
     * The exercise view: the timer is the app's running timer (goes on between card and page, saves itself),
     * stays small on start and offers "Mark as done" at the end (event `mark-done`).
     */
    @property({type: Boolean})
    shared = false;

    /** Big controls in one row (new exercise view). */
    @property({type: Boolean})
    compact = false;

    /** On the home card: the timer opens its large view on start, and the card shows its own progress bar. */
    @property({type: Boolean})
    onCard = false;

    render() {
        const target = exerciseTarget(this.item);
        if (isTimeExercise(this.item.exerciseType)) {
            return html`
                <exercise-timer .targetSeconds="${target}" .completedSeconds="${this.value}"
                                .label="${this.item.exerciseTitle}"
                                .exerciseId="${this.shared ? this.item.exerciseId : ""}"
                                .focusOnStart="${this.onCard || !this.shared}" ?compact="${this.compact}" ?offerDone="${this.shared && !this.done}"
                                @mark-done="${() => this.dispatchEvent(new CustomEvent("mark-done"))}"
                                @progress-changed="${this.forward}"></exercise-timer>`;
        }
        if (isRepExercise(this.item.exerciseType)) {
            return html`
                <rep-counter ?compact="${this.compact}" .target="${target}" .value="${this.value}"
                             @progress-changed="${this.forward}"></rep-counter>
                ${this.onCard ? nothing : html`
                    <sl-progress-bar class="${this.done ? "done" : ""}" value="${progressPercent(this.value, target)}"
                                     label="Progress"></sl-progress-bar>
                `}`;
        }
        return nothing;
    }

    private forward = (e: CustomEvent<number>) => {
        this.dispatchEvent(new CustomEvent<number>("progress-changed", {detail: e.detail}));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-progress": ExerciseProgress;
    }
}
