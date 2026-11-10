// @vitest-environment happy-dom
import {describe, expect, it, vi} from "vitest";
import "./confirm-dialog";
import {ConfirmDialog} from "./confirm-dialog";

async function mount(props: Partial<ConfirmDialog> = {}) {
    const dialog = document.createElement("confirm-dialog");
    Object.assign(dialog, props);
    dialog.textContent = "Really?";
    document.body.append(dialog);
    await dialog.updateComplete;
    const buttons = dialog.shadowRoot!.querySelectorAll("sl-button");
    return {dialog, cancelButton: buttons[0] as HTMLElement, confirmButton: buttons[1] as HTMLElement};
}

describe("confirm-dialog", () => {
    it("renders labels and passes open to sl-dialog", async () => {
        const {dialog, cancelButton, confirmButton} = await mount({
            open: true, label: "Delete exercise", confirmLabel: "Delete", cancelLabel: "Close", variant: "warning",
        });

        const slDialog = dialog.shadowRoot!.querySelector("sl-dialog") as any;
        expect(slDialog.getAttribute("label")).toBe("Delete exercise");
        expect(slDialog.open).toBe(true);
        expect(cancelButton.textContent).toBe("Close");
        expect(confirmButton.textContent).toBe("Delete");
        expect(confirmButton.getAttribute("variant")).toBe("warning");
    });

    it("fires confirm on the confirm button", async () => {
        const {dialog, confirmButton} = await mount({open: true});
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        dialog.addEventListener("confirm", onConfirm);
        dialog.addEventListener("cancel", onCancel);

        confirmButton.click();

        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onCancel).not.toHaveBeenCalled();
    });

    it("fires cancel on the cancel button and when dismissed", async () => {
        const {dialog, cancelButton} = await mount({open: true});
        const onCancel = vi.fn();
        dialog.addEventListener("cancel", onCancel);

        cancelButton.click();
        dialog.shadowRoot!.querySelector("sl-dialog")!.dispatchEvent(new CustomEvent("sl-request-close"));

        expect(onCancel).toHaveBeenCalledTimes(2);
    });
});
