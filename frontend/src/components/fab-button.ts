import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

/**
 * Floating action button for the main action of a page – phones only (≤ 768px), placed above the
 * bottom navigation. On larger screens it is hidden; keep a normal button for the same action there.
 * Listen to `click` on the element.
 */
@customElement("fab-button")
export class FabButton extends LitElement {

    static styles = css`
        :host {
            display: none;
        }

        @media (max-width: 768px) {
            :host {
                display: block;
                position: fixed;
                z-index: 50;
                right: max(var(--app-space-4), env(safe-area-inset-right));
                bottom: calc(var(--app-bottom-nav-height) + env(safe-area-inset-bottom) + var(--app-space-4));
            }
        }

        button {
            display: grid;
            place-items: center;
            width: 56px;
            height: 56px;
            border: none;
            border-radius: 50%;
            background: var(--app-accent);
            color: var(--app-on-accent);
            box-shadow: var(--app-shadow-raised);
            font-size: 1.5rem;
            cursor: pointer;
        }

        button:active {
            transform: scale(0.96);
        }

        button:focus-visible {
            outline: 3px solid var(--app-accent);
            outline-offset: 3px;
        }
    `;

    /** Shoelace icon name. */
    @property()
    icon = "plus-lg";

    /** Accessible name, e.g. "New exercise". */
    @property()
    label = "";

    render() {
        return html`
            <button type="button" aria-label="${this.label}" title="${this.label}">
                <sl-icon name="${this.icon}"></sl-icon>
            </button>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "fab-button": FabButton;
    }
}
