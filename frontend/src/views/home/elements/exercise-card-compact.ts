import {css, html, nothing} from "lit";
import {keyed} from "lit/directives/keyed.js";
import {customElement, property, state} from "lit/decorators.js";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {RootState, store} from "../../../store";
import {touchStyles} from "../../../styles/touch";
import {exerciseTarget, formatGoal, progressPercent, streakOf} from "../../../utils/exercise";
import {formatTimeLeft, isUrgent} from "../../../utils/format";
import {isPlainClick} from "../../../utils/navigation";
import {vibrate} from "../../../utils/preferences";
import {runningTimer} from "../../../utils/running-timer";
import {selectCurrentUser} from "../../login/slice/userSlice";
import {selectCanChooseReminders, selectReminders} from "../../options/slice/pushSlice";
import {CheckDto} from "../models/checkDto";
import {ExerciseDto} from "../models/exerciseDto";
import {selectProgress} from "../slice/exerciseSlice";
import {saveProgress} from "../slice/progressSaver";
import {cardStyles} from "./card-styles";
import "./exercise-progress";
import "./exercise-sort-controls";

/** Events of `<exercise-card-compact>`; detail is the {@link ExerciseDto}, for `checkChanged` the new "done" state. */
export const ExerciseCardCompactEvents = {
    open: "open-exercise",
    checkChanged: "check-changed",
    moveUp: "move-up",
    moveDown: "move-down",
} as const;

/**
 * Calm card of the new exercise view: title, goal, time left, streak, progress; big start / count controls and the
 * "done" circle. Tapping anywhere else opens the exercise, where everything else is.
 */
@customElement("exercise-card-compact")
export class ExerciseCardCompact extends ConnectedLitElement {

    static styles = [cardStyles, touchStyles, css`
        .card {
            position: relative;
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: var(--app-space-3);
        }

        .card:hover {
            border-color: var(--app-accent);
        }

        .card.done:hover {
            border-color: var(--app-success);
        }

        .title {
            min-width: 0;
        }

        .headline {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-1) var(--app-space-2);
        }

        .headline a {
            min-width: 0;
            color: inherit;
            text-decoration: none;
        }

        /* the link covers the whole card; controls come later in the document, so they lie above it
           (no z-index on them: it would trap the timer's large view below the page header) */
        .headline a::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: var(--app-radius);
        }

        .headline a:focus-visible {
            outline: none;
        }

        .headline a:focus-visible::after {
            outline: 2px solid var(--app-accent);
            outline-offset: 2px;
        }

        .done-toggle, .control, exercise-sort-controls {
            position: relative;
        }

        .done-toggle {
            font-size: 1.9rem;
            color: var(--app-text-subtle);
        }

        .done .done-toggle {
            color: var(--app-success);
        }

        .done-toggle::part(base) {
            color: inherit;
            min-width: 48px;
            min-height: 48px;
            justify-content: center;
            padding: 0;
        }

        sl-progress-bar {
            grid-column: 1 / -1;
            --height: 6px;
            --indicator-color: var(--app-accent);
        }

        .done sl-progress-bar {
            --indicator-color: var(--app-success);
        }

        .control {
            grid-column: 1 / -1;
        }

        /* computers: the control sits between title and circle */
        @media (min-width: 769px) {
            .card.with-control {
                grid-template-columns: 1fr 260px auto;
            }

            .with-control .control {
                grid-column: 2;
                grid-row: 1;
            }

            .with-control .done-toggle {
                grid-column: 3;
                grid-row: 1;
            }
        }
    `];

    @property({attribute: false})
    item: ExerciseDto = {exerciseId: "", exerciseTitle: "", creator: ""} as ExerciseDto;

    @property({type: Boolean})
    editMode = false;

    /** The current user finished the exercise in this period. */
    @property({type: Boolean})
    checked = false;

    /** Everybody who finished it in this period, with their streak. */
    @property({attribute: false})
    finishedUser: CheckDto[] = [];

    @state()
    private username = "";

    @state()
    private reminderOn = false;

    /** undefined until loaded */
    @state()
    private progress?: number;

    @state()
    private timerRunning = false;

    private stopTimerUpdates?: () => void;

    connectedCallback() {
        super.connectedCallback();
        this.stopTimerUpdates = runningTimer.subscribe(this.updateTimerRunning);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopTimerUpdates?.();
    }

    protected willUpdate(changed: Map<string, unknown>) {
        if (changed.has("item")) {
            this.updateTimerRunning();
            this.stateChanged(store.getState());
        }
    }

    private updateTimerRunning = () => {
        this.timerRunning = runningTimer.of(this.item.exerciseId) !== undefined;
    }

    stateChanged(state: RootState) {
        this.username = selectCurrentUser(state)?.username ?? "";
        this.reminderOn = selectCanChooseReminders(state) && selectReminders(state).includes(this.item.exerciseId);
        this.progress = selectProgress(state, this.item.exerciseId);
    }

    render() {
        // done: nothing left to start (a timer that still runs stays visible)
        const control = !this.editMode && this.progress !== undefined && (!this.checked || this.timerRunning);
        const streak = streakOf(this.finishedUser, this.username);
        return html`
            <article class="card ${this.checked ? "done" : ""} ${control ? "with-control" : ""}">
                <div class="title">
                    <h2 class="headline">
                        ${this.editMode ? this.item.exerciseTitle : html`
                            <a href="/exercises/${this.item.exerciseId}" @click="${this.open}">${this.item.exerciseTitle}</a>
                        `}
                        ${streak && streak > 1 ? html`<span class="streak" title="Your streak">🔥 ${streak}</span>` : nothing}
                    </h2>
                    <div class="subtitle">
                        <span>${formatGoal(this.item)}</span>
                        <span>·</span>
                        ${this.checked
                                ? html`<span>Done for this period</span>`
                                : html`<span class="${isUrgent(this.item.timeLeftSeconds) ? "urgent" : ""}">
                                    ${formatTimeLeft(this.item.timeLeftSeconds)}</span>`}
                        ${this.reminderOn ? html`
                            <sl-icon class="reminder-icon" name="bell-fill" label="Reminder on"></sl-icon>
                        ` : nothing}
                    </div>
                </div>
                ${this.editMode ? html`
                    <exercise-sort-controls
                            @move-up="${() => this.emit(ExerciseCardCompactEvents.moveUp, this.item)}"
                            @move-down="${() => this.emit(ExerciseCardCompactEvents.moveDown, this.item)}"></exercise-sort-controls>
                ` : html`
                    <sl-icon-button class="done-toggle" name="${this.checked ? "check-circle-fill" : "circle"}"
                                    label="${this.checked ? "Done – tap to undo" : "Mark as done"}: ${this.item.exerciseTitle}"
                                    @click="${this.toggleDone}"></sl-icon-button>
                `}
                ${this.editMode ? nothing : this.renderBar()}
                ${control ? keyed(this.item.exerciseId, html`
                    <exercise-progress class="control" compact shared onCard .item="${this.item}" .value="${this.progress}"
                                       ?done="${this.checked}" @mark-done="${this.toggleDone}"
                                       @progress-changed="${this.saveProgress(this.item.exerciseId)}"></exercise-progress>
                `) : nothing}
            </article>
        `;
    }

    /** Only once something was done. */
    private renderBar() {
        return this.progress && !this.checked ? html`
            <sl-progress-bar value="${progressPercent(this.progress, exerciseTarget(this.item))}"
                             label="Progress"></sl-progress-bar>` : nothing;
    }

    /** Bound to the exercise it was rendered for (the card may be reused for another one). */
    private saveProgress(exerciseId: string) {
        return (e: CustomEvent<number>) => saveProgress(exerciseId, e.detail);
    }

    private open = (e: MouseEvent) => {
        if (!isPlainClick(e)) return; // e.g. open in a new tab
        e.preventDefault();
        this.emit(ExerciseCardCompactEvents.open, this.item);
    }

    private toggleDone = () => {
        if (!this.checked) vibrate(30);
        this.emit(ExerciseCardCompactEvents.checkChanged, !this.checked);
    }

    private emit<T>(type: string, detail: T) {
        this.dispatchEvent(new CustomEvent<T>(type, {detail}));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-card-compact": ExerciseCardCompact;
    }
}
