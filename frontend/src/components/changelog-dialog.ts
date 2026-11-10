import {html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {ChangelogEntry} from "../shared-slices/changelog/changelogSlice";
import "./changelog-entries";

/**
 * "What's new" dialog: shows the given entries while {@link open}. Emits `close` when the user
 * dismisses it (button, Escape, overlay); the parent marks the entries as seen.
 */
@customElement("changelog-dialog")
export class ChangelogDialog extends LitElement {

    @property({type: Boolean})
    open = false;

    @property({attribute: false})
    entries: ChangelogEntry[] = [];

    render() {
        return html`
            <sl-dialog label="What's new" .open="${this.open}" @sl-request-close="${this.close}">
                <changelog-entries .entries="${this.entries}"></changelog-entries>
                <sl-button slot="footer" variant="primary" @click="${this.close}">Got it</sl-button>
            </sl-dialog>
        `;
    }

    private close = () => {
        this.dispatchEvent(new CustomEvent("close"));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "changelog-dialog": ChangelogDialog;
    }
}
