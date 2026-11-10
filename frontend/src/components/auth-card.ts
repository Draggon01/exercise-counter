import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

/**
 * Centered card with the app brand for pages outside the app shell (login, register).
 * The form goes into the default slot, links / hints into slot `footer`.
 */
@customElement("auth-card")
export class AuthCard extends LitElement {

    static styles = css`
        :host {
            display: grid;
            place-items: center;
            min-height: 100vh;
            min-height: 100dvh;
            box-sizing: border-box;
            padding: max(var(--app-space-4), env(safe-area-inset-top)) max(var(--app-space-4), env(safe-area-inset-right))
                     max(var(--app-space-4), env(safe-area-inset-bottom)) max(var(--app-space-4), env(safe-area-inset-left));
            background: var(--app-bg);
        }

        .wrapper {
            width: 100%;
            max-width: 400px;
        }

        .brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--app-space-2);
            margin-bottom: var(--app-space-5);
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--app-text);
        }

        .brand sl-icon {
            font-size: 1.8rem;
            color: var(--app-accent);
        }

        .card {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
            padding: var(--app-space-6);
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius);
            background: var(--app-surface);
            box-shadow: var(--app-shadow-raised);
        }

        h1 {
            margin: 0;
            font-size: 1.4rem;
            color: var(--app-text);
        }

        .subtitle {
            margin: calc(-1 * var(--app-space-3)) 0 0;
            color: var(--app-text-muted);
        }

        .footer {
            margin-top: var(--app-space-4);
            text-align: center;
            font-size: 0.9em;
            color: var(--app-text-muted);
        }

        @media (max-width: 480px) {
            :host {
                place-items: start center;
                padding-top: 10vh;
            }

            .card {
                padding: var(--app-space-5) var(--app-space-4);
                box-shadow: none;
            }
        }
    `;

    @property()
    heading = "";

    @property()
    subtitle = "";

    render() {
        return html`
            <div class="wrapper">
                <div class="brand">
                    <sl-icon name="lightning-charge-fill"></sl-icon>
                    Exercise Counter
                </div>
                <div class="card">
                    <h1>${this.heading}</h1>
                    ${this.subtitle ? html`<p class="subtitle">${this.subtitle}</p>` : ""}
                    <slot></slot>
                </div>
                <div class="footer"><slot name="footer"></slot></div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "auth-card": AuthCard;
    }
}
