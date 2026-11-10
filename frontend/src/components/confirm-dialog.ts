import {html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

export type ConfirmVariant = "danger" | "warning" | "primary";

/**
 * Asks the user to confirm an action. The parent controls {@link open} and reacts to the events:
 * - `confirm`: the confirm button was clicked
 * - `cancel`: the cancel button was clicked or the dialog was dismissed (Escape, overlay, ✕)
 *
 * The message goes into the default slot.
 *
 * @example
 * <confirm-dialog .open=${this.askDelete} label="Delete exercise" confirmLabel="Delete"
 *                 @confirm=${this.delete} @cancel=${() => this.askDelete = false}>
 *     This cannot be undone.
 * </confirm-dialog>
 */
@customElement("confirm-dialog")
export class ConfirmDialog extends LitElement {

    @property({type: Boolean})
    open = false;

    @property()
    label = "Are you sure?";

    @property()
    confirmLabel = "Confirm";

    @property()
    cancelLabel = "Cancel";

    @property()
    variant: ConfirmVariant = "danger";

    render() {
        return html`
            <sl-dialog label="${this.label}" .open="${this.open}" @sl-request-close="${this.cancel}">
                <slot></slot>
                <sl-button slot="footer" variant="default" @click="${this.cancel}">${this.cancelLabel}</sl-button>
                <sl-button slot="footer" variant="${this.variant}" @click="${this.confirm}">${this.confirmLabel}</sl-button>
            </sl-dialog>
        `;
    }

    private confirm = () => {
        this.dispatchEvent(new CustomEvent("confirm"));
    }

    private cancel = () => {
        this.dispatchEvent(new CustomEvent("cancel"));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "confirm-dialog": ConfirmDialog;
    }
}
