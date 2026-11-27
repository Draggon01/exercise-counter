import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

/** Wait this long after the last change before reporting it (avoids a request per click). */
export const REP_SAVE_DEBOUNCE_MS = 500;

/** How long after leaving the number field a tap elsewhere only ends the input (touch screens). */
const TAP_OUTSIDE_GUARD_MS = 700;

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

    private guardEnd?: ReturnType<typeof setTimeout>;

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.debounce) this.report(); // removed before the last change was reported
        this.endGuard();
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
                <sl-input type="number" inputmode="numeric" enterkeyhint="done" size="large" min="0" no-spin-buttons
                          aria-label="Repetitions done" .value="${String(this.value)}"
                          @sl-change="${this.onChange}" @keydown="${this.finishOnEnter}"
                          @sl-focus="${this.guardTapOutside}" @sl-blur="${this.endGuardSoon}"></sl-input>
                <sl-button size="large" aria-label="One more"
                           @click="${() => this.change(this.value + 1)}">+</sl-button>
            </div>
        `;
    }

    /** Enter / "Done" on the keyboard: take the number (sl-change) and close the keyboard. */
    private finishOnEnter = (e: KeyboardEvent) => {
        if (e.key === "Enter") (e.currentTarget as HTMLElement).blur();
    }

    /**
     * On touch screens the first tap outside the field only ends the input (keyboard closes, number
     * is saved) – it does not also open the card below it or press something else by accident.
     */
    private guardTapOutside = () => {
        if (!window.matchMedia?.("(pointer: coarse)").matches) return;
        clearTimeout(this.guardEnd);
        window.addEventListener("click", this.swallowTapOutside, true);
    }

    /** The tap that moved the focus away comes right after the blur; later taps work normally again. */
    private endGuardSoon = () => {
        clearTimeout(this.guardEnd);
        this.guardEnd = setTimeout(this.endGuard, TAP_OUTSIDE_GUARD_MS);
    }

    private endGuard = () => {
        clearTimeout(this.guardEnd);
        window.removeEventListener("click", this.swallowTapOutside, true);
    }

    private swallowTapOutside = (e: MouseEvent) => {
        if (e.composedPath().includes(this)) return; // − / + of this counter keep working
        e.preventDefault();
        e.stopPropagation();
        this.endGuard();
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
