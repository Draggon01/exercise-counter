import {css, html, LitElement, nothing} from "lit";
import {customElement, property} from "lit/decorators.js";
import {navigate} from "../utils/navigation";
import {touchStyles} from "../styles/touch";

/**
 * Header of a page: title, optional Back button (set `backTo`) and actions on the right.
 * Stays at the top while the page scrolls. On phones (≤768px) it is the app's top bar: full width,
 * back arrow as icon, actions as icons – the app shell shows no header of its own there.
 *
 * @example
 * <page-header heading="Statistics" backTo="/">
 *     <sl-icon-button slot="actions" name="arrow-down-up" label="Edit order"></sl-icon-button>
 * </page-header>
 */
@customElement("page-header")
export class PageHeader extends LitElement {

    static styles = [touchStyles, css`
        /* the scroll container is the app shell's main */
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
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }

        .back-icon {
            display: none;
            font-size: 1.35rem;
        }

        /* ---- phones: the top bar of the app */
        @media (max-width: 768px) {
            :host {
                box-sizing: border-box;
                gap: var(--app-space-1);
                min-height: var(--app-header-height);
                /* full width: cancels the page padding (pageStyles) */
                margin: calc(-1 * var(--app-space-3)) calc(-1 * max(var(--app-space-3), env(safe-area-inset-right))) var(--app-space-3) calc(-1 * max(var(--app-space-3), env(safe-area-inset-left)));
                padding: 0 max(var(--app-space-2), env(safe-area-inset-right)) 0 max(var(--app-space-4), env(safe-area-inset-left));
                background: var(--app-surface);
                border-bottom: 1px solid var(--app-border);
            }

            :host([back]) {
                padding-left: max(var(--app-space-1), env(safe-area-inset-left));
            }

            h2 {
                font-size: 1.15rem;
                font-weight: 600;
            }

            .back-button {
                display: none;
            }

            .back-icon {
                display: inline-flex;
            }

            .actions {
                gap: var(--app-space-1);
            }
        }
    `];

    @property()
    heading = "";

    /** Where the Back button leads; no Back button if empty (main sections are in the navigation). */
    @property()
    backTo = "";

    /** `back` attribute: the phone layout leaves less room on the left next to the back arrow. */
    protected willUpdate() {
        this.toggleAttribute("back", !!this.backTo);
    }

    render() {
        return html`
            ${this.backTo ? html`
                <sl-button class="back-button" variant="default" @click="${this.back}">
                    <sl-icon slot="prefix" name="arrow-left"></sl-icon>
                    Back
                </sl-button>
                <sl-icon-button class="back-icon" name="arrow-left" label="Back" @click="${this.back}"></sl-icon-button>
            ` : nothing}
            <h2>${this.heading}</h2>
            <div class="actions"><slot name="actions"></slot></div>
        `;
    }

    private back = () => navigate(this.backTo);
}

declare global {
    interface HTMLElementTagNameMap {
        "page-header": PageHeader;
    }
}
