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

    private debounce?: ReturnType<typeof setTimeout>;

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this.debounce) clearTimeout(this.debounce);
    }

    render() {
        return html`
            <div class="rep-section">
                <sl-input class="rep-input" type="number" size="small" min="0" max="${this.target}" no-spin-buttons
                          .value="${String(this.value)}"
                          @sl-change="${this.onChange}"></sl-input>
                <span>/ ${this.target}</span>
            </div>
        `;
    }

    private onChange = (e: Event) => {
        const parsed = parseInt((e.target as HTMLInputElement).value, 10);
        this.value = Math.max(0, isNaN(parsed) ? 0 : parsed);
        if (this.debounce) clearTimeout(this.debounce);
        this.debounce = setTimeout(
            () => this.dispatchEvent(new CustomEvent<number>("progress-changed", {detail: this.value})),
            REP_SAVE_DEBOUNCE_MS);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "rep-counter": RepCounter;
    }
}
