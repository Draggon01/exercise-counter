import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {navigate} from "../utils/navigation";

/**
 * Header of a page: title, optional Back button (set `backTo`) and actions on the right.
 *
 * @example
 * <page-header heading="Statistics" backTo="/">
 *     <sl-button slot="actions">Create Group</sl-button>
 * </page-header>
 */
@customElement("page-header")
export class PageHeader extends LitElement {

    static styles = css`
        /* stays visible while the page scrolls (the scroll container is the app shell's main) */
        :host {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            align-items: center;
            gap: 20px;
            margin: calc(-1 * var(--app-space-2)) 0 1rem;
            padding: var(--app-space-2) 0;
            background: var(--app-bg);
        }

        h2 {
            margin: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .actions {
            margin-left: auto;
            display: flex;
            gap: 8px;
        }

        @media (max-width: 768px) {
            :host {
                gap: 12px;
            }
        }
    `;

    @property()
    heading = "";

    /** Where the Back button leads; no Back button if empty (main sections are in the navigation). */
    @property()
    backTo = "";

    render() {
        return html`
            ${this.backTo ? html`
                <sl-button variant="default" @click="${() => navigate(this.backTo)}">
                    <sl-icon slot="prefix" name="arrow-left"></sl-icon>
                    Back
                </sl-button>
            ` : ""}
            <h2>${this.heading}</h2>
            <div class="actions"><slot name="actions"></slot></div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "page-header": PageHeader;
    }
}
