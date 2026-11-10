import {css, html, LitElement, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {formatDuration} from "../../../utils/format";

/**
 * Countdown for time exercises. Emits `progress-changed` (detail: seconds completed) when paused,
 * finished or reset, so the parent can save it. Plays a sound when finished.
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
        }

        .timer-display.completed {
            color: var(--app-success);
        }

        .timer-controls {
            display: flex;
            gap: 4px;
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

    @state()
    private secondsLeft = 0;

    @state()
    private running = false;

    private interval?: ReturnType<typeof setInterval>;

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
    }

    private get finished() {
        return this.secondsLeft === 0 && this.targetSeconds > 0;
    }

    render() {
        const atStart = this.secondsLeft === this.targetSeconds;
        return html`
            <div class="timer-row">
                <div class="timer-display ${this.finished ? "completed" : ""}">
                    ${this.finished ? "✓ Done!" : formatDuration(this.secondsLeft)}
                </div>
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
        `;
    }

    private start = () => {
        if (this.running || this.finished) return;
        this.running = true;
        this.interval = setInterval(() => {
            this.secondsLeft = Math.max(0, this.secondsLeft - 1);
            if (this.secondsLeft === 0) {
                this.stop();
                playFinishSound();
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
        this.emitProgress();
    }

    private stop() {
        this.running = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
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
