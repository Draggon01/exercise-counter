// @vitest-environment happy-dom
import {describe, expect, it} from "vitest";
import {toast} from "./toast";

describe("toast", () => {
    it("creates a closable sl-alert with icon and plain-text message", () => {
        const alert = toast("<b>Could not save</b>", "danger", 1000) as any;

        expect(alert.tagName).toBe("SL-ALERT");
        expect(alert.variant).toBe("danger");
        expect(alert.closable).toBe(true);
        expect(alert.duration).toBe(1000);
        expect(alert.querySelector("sl-icon").getAttribute("name")).toBe("exclamation-octagon");
        expect(alert.textContent).toBe("<b>Could not save</b>");
        expect(alert.querySelector("b")).toBeNull();
    });

    it("does not stack the same message twice while it is visible", () => {
        const first = toast("Saved", "success");
        expect(toast("Saved", "success")).toBeNull();

        first!.dispatchEvent(new Event("sl-after-hide"));
        expect(toast("Saved", "success")).not.toBeNull();
    });
});
