import {css, html, LitElement, nothing, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {Countdown} from "../../../utils/countdown";
import {formatDuration} from "../../../utils/format";
import {runningTimer} from "../../../utils/running-timer";
import {touchStyles} from "../../../styles/touch";

/** Events of `<exercise-timer>`. */
export const ExerciseTimerEvents = {
    /** detail: seconds done (not with `exerciseId`: then the running timer saves itself) */
    progressChanged: "progress-changed",
    /** "Mark as done" of a finished timer (only with `offerDone`), without detail */
    markDone: "mark-done",
    /** detail: the large view is open (bubbles) – it must not lie in a stacking context such as a sticky box */
    focusChanged: "timer-focus-changed",
} as const;

/**
 * Countdown for time exercises. While it runs, a large focus view shows the time (minimize keeps it
 * running, tapping the small display reopens it).
 * Without `exerciseId` it belongs to this element: emits `progress-changed` when paused, finished, reset or removed
 * while running, so the parent can save it. With `exerciseId` it is the app's running timer (`runningTimer`): it
 * saves itself and goes on when another `<exercise-timer>` of that exercise takes over (card → exercise page).
 */
@customElement("exercise-timer")
export class ExerciseTimer extends LitElement {

    static styles = [touchStyles, css`
        .timer-row {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .timer-display {
            font-size: 1.15em;
            font-weight: bold;
            font-family: var(--app-font-mono);
            color: var(--app-text);
            min-width: 52px;
            padding: 0;
            border: none;
            background: none;
        }

        button.timer-display {
            cursor: pointer;
            color: var(--app-accent);
            text-decoration: underline dotted;
        }

        .timer-display.completed {
            color: var(--app-success);
        }

        .timer-controls {
            display: flex;
            gap: 4px;
        }

        /* ---- one big row (calm card) */
        .compact {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-2);
        }

        .compact sl-button {
            flex: 1000 1 auto;
        }

        /* as small as possible next to the main button, full width below it */
        .compact sl-button.secondary {
            flex: 1 0 auto;
        }

        .compact sl-button::part(base) {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 56px;
            font-size: 1.1rem;
        }

        .compact .timer-display {
            flex: 1;
            min-height: 56px;
            font-size: 1.6rem;
            text-align: center;
        }

        /* ---- focus view while running */
        .focus {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--app-space-5);
            padding: calc(var(--app-space-5) + env(safe-area-inset-top)) var(--app-space-4) calc(var(--app-space-5) + env(safe-area-inset-bottom));
            background: var(--app-bg);
            color: var(--app-text);
        }

        .focus-title {
            margin: 0;
            max-width: 90vw;
            font-size: 1.3rem;
            font-weight: 600;
            text-align: center;
            overflow-wrap: anywhere;
        }

        sl-progress-ring {
            --size: min(78vw, 46vh, 360px);
            --track-width: 12px;
            --indicator-width: 12px;
            --track-color: var(--app-chart-track);
            --indicator-color: var(--app-accent);
        }

        .big-time {
            font-family: var(--app-font-mono);
            font-size: clamp(3rem, 17vw, 6rem);
            font-weight: 700;
            letter-spacing: -0.02em;
            font-variant-numeric: tabular-nums;
        }

        .big-time.completed {
            font-family: var(--app-font);
            font-size: clamp(2rem, 11vw, 3.5rem);
            color: var(--app-success);
        }

        .focus.completed sl-progress-ring {
            --indicator-color: var(--app-success);
        }

        .focus-controls {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: var(--app-space-3);
        }

        .focus-controls sl-button::part(base) {
            min-width: 120px;
        }

        @media (max-width: 400px) {
            .timer-row {
                gap: 6px;
            }

            .timer-display {
                font-size: 1em;
                min-width: 44px;
            }
        }
    `];

    /** Duration of the exercise in seconds. */
    @property({type: Number})
    targetSeconds = 0;

    /** Seconds already done in the current period (from the saved log). */
    @property({type: Number})
    completedSeconds = 0;

    /** Shown above the large time, e.g. the exercise title. */
    @property()
    label = "";

    /** Exercise whose timer survives this element; empty: the timer belongs to the element. */
    @property()
    exerciseId = "";

    /** Open the large focus view on start (it can always be opened while running). */
    @property({attribute: false})
    focusOnStart = true;

    /** Offer "Mark as done" when finished. */
    @property({type: Boolean})
    offerDone = false;

    /** One row with a big start / pause button (new exercise view). */
    @property({type: Boolean})
    compact = false;

    /** The large focus view is shown (opens on start, can be minimized). */
    @state()
    private focused = false;

    private readonly own = new Countdown();
    private countdown = this.own;
    private unsubscribe?: () => void;

    connectedCallback() {
        super.connectedCallback();
        this.use(this.countdown);
    }

    protected willUpdate(changed: PropertyValues<this>) {
        if (!changed.has("targetSeconds") && !changed.has("completedSeconds") && !changed.has("exerciseId")) return;
        const running = this.exerciseId ? runningTimer.of(this.exerciseId) : undefined;
        if (running?.target === this.targetSeconds) {
            this.use(running); // saved progress arriving late must not stop it
            return;
        }
        running?.pause(); // the goal was changed
        this.own.report = seconds => this.reportProgress(seconds);
        this.use(this.own);
        this.own.set(this.targetSeconds, this.completedSeconds);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.countdown.running && !this.exerciseId) {
            // e.g. the card collapsed while the timer was running: keep what was done so far
            this.countdown.pause();
        }
        this.unsubscribe?.();
        this.closeFocus();
    }

    private use(countdown: Countdown) {
        this.unsubscribe?.();
        this.countdown = countdown;
        this.unsubscribe = countdown.subscribe(() => this.requestUpdate());
    }

    private get secondsLeft() {
        return this.countdown.secondsLeft;
    }

    private get running() {
        return this.countdown.running;
    }

    private get finished() {
        return this.countdown.finished;
    }

    render() {
        return html`
            ${this.compact ? this.renderCompact() : this.renderRow()}
            ${this.focused ? this.renderFocus() : nothing}
        `;
    }

    private renderCompact() {
        if (this.finished) {
            return html`
                <div class="compact">
                    ${this.offerDone ? html`
                        <sl-button size="large" variant="success" @click="${this.markDone}">✓ Mark as done</sl-button>
                    ` : html`<div class="timer-display completed">✓ Done!</div>`}
                    <sl-button size="large" @click="${this.reset}">Reset</sl-button>
                </div>`;
        }
        if (this.running) {
            return html`
                <div class="compact">
                    <button class="timer-display" title="Show large timer" @click="${this.openFocus}">
                        ${formatDuration(this.secondsLeft)}
                    </button>
                    <sl-button size="large" variant="warning" @click="${this.pause}">⏸ Pause</sl-button>
                    ${this.focusOnStart ? nothing : html`
                        <sl-icon-button name="arrows-fullscreen" label="Show large timer"
                                        @click="${this.openFocus}"></sl-icon-button>
                    `}
                </div>`;
        }
        return html`
            <div class="compact">
                <sl-button size="large" variant="primary" outline @click="${this.start}">
                    ▶ ${this.secondsLeft === this.targetSeconds ? "Start" : "Resume"} ${formatDuration(this.secondsLeft)}
                </sl-button>
                ${this.focusOnStart || this.secondsLeft === this.targetSeconds ? nothing : html`
                    <sl-button class="secondary" size="large" @click="${this.reset}">Reset</sl-button>
                `}
            </div>`;
    }

    private renderRow() {
        const atStart = this.secondsLeft === this.targetSeconds;
        return html`
            <div class="timer-row">
                ${this.running && !this.focused ? html`
                    <button class="timer-display" title="Show large timer" @click="${this.openFocus}">
                        ${formatDuration(this.secondsLeft)}
                    </button>
                ` : html`
                    <div class="timer-display ${this.finished ? "completed" : ""}">
                        ${this.finished ? "✓ Done!" : formatDuration(this.secondsLeft)}
                    </div>
                `}
                <div class="timer-controls">
                    ${this.finished ? html`
                        ${this.offerDone ? html`
                            <sl-button size="small" variant="success" @click="${this.markDone}">Mark as done</sl-button>
                        ` : nothing}
                        <sl-button size="small" variant="neutral" @click="${this.reset}">Reset</sl-button>
                    ` : this.running ? html`
                        <sl-button size="small" variant="warning" @click="${this.pause}">⏸ Pause</sl-button>
                        ${this.focusOnStart ? nothing : html`
                            <sl-icon-button name="arrows-fullscreen" label="Show large timer"
                                            @click="${this.openFocus}"></sl-icon-button>
                        `}
                    ` : html`
                        <sl-button size="small" variant="primary" @click="${this.start}">
                            ${atStart ? "▶ Start" : "▶ Resume"}
                        </sl-button>
                        ${atStart ? "" : html`
                            <sl-button size="small" variant="neutral" @click="${this.reset}">Reset</sl-button>
                        `}
                    `}
                </div>
            </div>
        `;
    }

    private renderFocus() {
        const done = this.finished;
        const percent = this.targetSeconds > 0 ? (this.secondsLeft / this.targetSeconds) * 100 : 0;
        return html`
            <div class="focus ${done ? "completed" : ""}" role="dialog" aria-modal="true"
                 aria-label="${this.label ? `Timer: ${this.label}` : "Timer"}">
                ${this.label ? html`<h2 class="focus-title">${this.label}</h2>` : nothing}
                <sl-progress-ring value="${done ? 100 : percent}">
                    <span class="big-time ${done ? "completed" : ""}">
                        ${done ? "✓ Done!" : formatDuration(this.secondsLeft)}
                    </span>
                </sl-progress-ring>
                <div class="focus-controls">
                    ${done ? html`
                        ${this.offerDone ? html`
                            <sl-button size="large" variant="success" @click="${this.markDone}">Mark as done</sl-button>
                        ` : nothing}
                        <sl-button size="large" variant="${this.offerDone ? "default" : "success"}"
                                   @click="${this.closeFocus}">Close</sl-button>
                    ` : html`
                        ${this.running
                                ? html`<sl-button size="large" variant="warning" @click="${this.pause}">⏸ Pause</sl-button>`
                                : html`<sl-button size="large" variant="primary" @click="${this.start}">▶ Resume</sl-button>`}
                        <sl-button size="large" @click="${this.reset}">Reset</sl-button>
                        <sl-button size="large" variant="text" @click="${this.closeFocus}">
                            <sl-icon slot="prefix" name="fullscreen-exit"></sl-icon>
                            Minimize
                        </sl-button>
                    `}
                </div>
            </div>
        `;
    }

    private start = () => {
        if (this.running || this.finished) return;
        if (this.exerciseId) {
            runningTimer.start(this.exerciseId, this.countdown);
        } else {
            this.countdown.start();
        }
        if (this.focusOnStart) this.openFocus();
    }

    private pause = () => this.countdown.pause();

    private reset = () => {
        this.countdown.reset();
        this.closeFocus();
    }

    private markDone = () => {
        this.closeFocus();
        this.dispatchEvent(new CustomEvent(ExerciseTimerEvents.markDone));
    }

    private openFocus = () => {
        this.setFocused(true);
        document.addEventListener("keydown", this.onKeydown);
    }

    private closeFocus = () => {
        this.setFocused(false);
        document.removeEventListener("keydown", this.onKeydown);
    }

    private setFocused(focused: boolean) {
        if (this.focused === focused) return;
        this.focused = focused;
        this.dispatchEvent(new CustomEvent<boolean>(ExerciseTimerEvents.focusChanged,
            {detail: focused, bubbles: true, composed: true}));
    }

    /** Escape minimizes the focus view (the timer keeps running). */
    private onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape") this.closeFocus();
    }

    private reportProgress(seconds: number) {
        if (this.exerciseId) {
            runningTimer.save(this.exerciseId, seconds);
        } else {
            this.dispatchEvent(new CustomEvent<number>(ExerciseTimerEvents.progressChanged, {detail: seconds}));
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-timer": ExerciseTimer;
    }
}
