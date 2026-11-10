import {css, html, LitElement, nothing, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {formatDuration} from "../../../utils/format";

/**
 * Countdown for time exercises. While it runs, a large focus view shows the time (minimize keeps it
 * running, tapping the small display reopens it) and the screen is kept on (Wake Lock, if supported).
 * Emits `progress-changed` (detail: seconds completed) when paused, finished, reset or removed while
 * running, so the parent can save it. Plays a sound when finished.
 */
@customElement("exercise-timer")
export class ExerciseTimer extends LitElement {

    static styles = css`
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
            padding: var(--app-space-5) var(--app-space-4) calc(var(--app-space-5) + env(safe-area-inset-bottom));
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
    `;

    /** Duration of the exercise in seconds. */
    @property({type: Number})
    targetSeconds = 0;

    /** Seconds already done in the current period (from the saved log). */
    @property({type: Number})
    completedSeconds = 0;

    /** Shown above the large time, e.g. the exercise title. */
    @property()
    label = "";

    @state()
    private secondsLeft = 0;

    @state()
    private running = false;

    /** The large focus view is shown (opens on start, can be minimized). */
    @state()
    private focused = false;

    private interval?: ReturnType<typeof setInterval>;
    private wakeLock?: WakeLockSentinel;

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has("targetSeconds") || changed.has("completedSeconds")) {
            this.stop();
            this.secondsLeft = Math.max(0, this.targetSeconds - this.completedSeconds);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.running) {
            // e.g. the card collapsed while the timer was running: keep what was done so far
            this.pause();
        }
        this.focused = false;
        document.removeEventListener("keydown", this.onKeydown);
    }

    private get finished() {
        return this.secondsLeft === 0 && this.targetSeconds > 0;
    }

    render() {
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
                        <sl-button size="small" variant="neutral" @click="${this.reset}">Reset</sl-button>
                    ` : this.running ? html`
                        <sl-button size="small" variant="warning" @click="${this.pause}">⏸ Pause</sl-button>
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
            ${this.focused ? this.renderFocus() : nothing}
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
                        <sl-button size="large" variant="success" @click="${this.closeFocus}">Close</sl-button>
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
        this.running = true;
        this.openFocus();
        void this.keepScreenOn();
        this.interval = setInterval(() => {
            this.secondsLeft = Math.max(0, this.secondsLeft - 1);
            if (this.secondsLeft === 0) {
                this.stop();
                playFinishSound();
                navigator.vibrate?.([200, 100, 200]);
                this.emitProgress();
            }
        }, 1000);
    }

    private pause = () => {
        this.stop();
        this.emitProgress();
    }

    private reset = () => {
        this.stop();
        this.secondsLeft = this.targetSeconds;
        this.closeFocus();
        this.emitProgress();
    }

    private stop() {
        this.running = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }
        void this.wakeLock?.release().catch(() => undefined);
        this.wakeLock = undefined;
    }

    private openFocus = () => {
        this.focused = true;
        document.addEventListener("keydown", this.onKeydown);
    }

    private closeFocus = () => {
        this.focused = false;
        document.removeEventListener("keydown", this.onKeydown);
    }

    /** Escape minimizes the focus view (the timer keeps running). */
    private onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape") this.closeFocus();
    }

    /** Keeps the screen on while the timer runs (not supported everywhere – then it just stays off). */
    private async keepScreenOn() {
        try {
            this.wakeLock = await navigator.wakeLock?.request("screen");
        } catch {
            // denied (e.g. battery saver) – the timer works anyway
        }
    }

    private emitProgress() {
        this.dispatchEvent(new CustomEvent<number>("progress-changed", {detail: this.targetSeconds - this.secondsLeft}));
    }
}

/** Three short beeps (Web Audio API). */
function playFinishSound() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx() as AudioContext;
    [0, 0.4, 0.8].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
        gain.gain.setValueAtTime(0.5, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.3);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.35);
    });
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-timer": ExerciseTimer;
    }
}
