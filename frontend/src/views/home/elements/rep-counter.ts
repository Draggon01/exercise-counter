import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

/** Wait this long after the last change before reporting it (avoids a request per click). */
export const REP_SAVE_DEBOUNCE_MS = 500;

/**
 * Reps done in the current period for rep exercises. Emits `progress-changed` (detail: reps)
 * {@link REP_SAVE_DEBOUNCE_MS} after the last change.
 */
@customElement("rep-counter")
export class RepCounter extends LitElement {

    static styles = css`
        .compact {
            display: grid;
            grid-template-columns: minmax(56px, 1fr) minmax(72px, 1fr) minmax(56px, 1fr);
            align-items: center;
            gap: var(--app-space-2);
        }

        .compact sl-button::part(base) {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 56px;
            font-size: 1.6rem;
        }

        .compact sl-input {
            --sl-input-height-large: 56px;
            --sl-input-font-size-large: 1.6rem;
        }

        .compact sl-input::part(input) {
            text-align: center;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
        }

        .rep-section {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .rep-input {
            width: 70px;
        }

        @media (max-width: 400px) {
            .rep-section {
                gap: 4px;
            }

            .rep-input {
                width: 56px;
            }
        }
    `;

    @property({type: Number})
    target = 0;

    @property({type: Number})
    value = 0;

    /** Big − / + buttons around the value (calm card). */
    @property({type: Boolean})
    compact = false;

    private debounce?: ReturnType<typeof setTimeout>;

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.debounce) this.report(); // removed before the last change was reported
    }

    render() {
        if (this.compact) return this.renderCompact();
        return html`
            <div class="rep-section">
                <sl-input class="rep-input" type="number" inputmode="numeric" size="small" min="0" max="${this.target}" no-spin-buttons
                          .value="${String(this.value)}"
                          @sl-change="${this.onChange}"></sl-input>
                <span>/ ${this.target}</span>
            </div>
        `;
    }

    private renderCompact() {
        return html`
            <div class="compact">
                <sl-button size="large" aria-label="One less" ?disabled="${this.value <= 0}"
                           @click="${() => this.change(this.value - 1)}">−</sl-button>
                <sl-input type="number" inputmode="numeric" size="large" min="0" no-spin-buttons
                          aria-label="Repetitions done" .value="${String(this.value)}"
                          @sl-change="${this.onChange}"></sl-input>
                <sl-button size="large" aria-label="One more"
                           @click="${() => this.change(this.value + 1)}">+</sl-button>
            </div>
        `;
    }

    private onChange = (e: Event) => {
        const parsed = parseInt((e.target as HTMLInputElement).value, 10);
        this.change(isNaN(parsed) ? 0 : parsed);
    }

    private change(value: number) {
        this.value = Math.max(0, value);
        if (this.debounce) clearTimeout(this.debounce);
        this.debounce = setTimeout(() => this.report(), REP_SAVE_DEBOUNCE_MS);
    }

    private report() {
        clearTimeout(this.debounce);
        this.debounce = undefined;
        this.dispatchEvent(new CustomEvent<number>("progress-changed", {detail: this.value}));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "rep-counter": RepCounter;
    }
}
