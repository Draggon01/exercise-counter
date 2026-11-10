import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

/**
 * Placeholder for "nothing here (yet)" or "could not load": icon, heading, text and optional
 * actions in the default slot.
 *
 * @example
 * <empty-state icon="journal-plus" heading="No exercises yet" text="Create one or browse public ones.">
 *     <sl-button variant="primary">Add exercise</sl-button>
 * </empty-state>
 */
@customElement("empty-state")
export class EmptyState extends LitElement {

    static styles = css`
        :host {
            display: block;
        }

        .empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--app-space-2);
            padding: var(--app-space-6) var(--app-space-4);
            border: 1px dashed var(--app-border);
            border-radius: var(--app-radius);
            text-align: center;
            color: var(--app-text-muted);
        }

        sl-icon {
            font-size: 2.5rem;
            color: var(--app-text-subtle);
        }

        h3 {
            margin: var(--app-space-2) 0 0;
            color: var(--app-text);
            font-size: 1.1rem;
        }

        p {
            margin: 0;
            max-width: 36ch;
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: var(--app-space-2);
            margin-top: var(--app-space-3);
        }

        .actions:not(:has(*)) {
            display: none;
        }
    `;

    /** Shoelace (Bootstrap) icon name. */
    @property()
    icon = "inbox";

    @property()
    heading = "";

    @property()
    text = "";

    render() {
        return html`
            <div class="empty" role="status">
                <sl-icon name="${this.icon}"></sl-icon>
                <h3>${this.heading}</h3>
                ${this.text ? html`<p>${this.text}</p>` : ""}
                <div class="actions"><slot></slot></div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "empty-state": EmptyState;
    }
}
