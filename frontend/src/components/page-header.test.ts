// @vitest-environment happy-dom
import {describe, expect, it, vi} from "vitest";
import "./page-header";

describe("page-header", () => {
    it("shows the heading and navigates back", async () => {
        const header = document.createElement("page-header");
        header.heading = "Groups";
        header.backTo = "/somewhere";
        document.body.append(header);
        await header.updateComplete;
        const onPopState = vi.fn();
        window.addEventListener("popstate", onPopState);

        expect(header.shadowRoot!.querySelector("h2")!.textContent).toBe("Groups");
        (header.shadowRoot!.querySelector("sl-button") as HTMLElement).click();

        expect(window.location.pathname).toBe("/somewhere");
        expect(onPopState).toHaveBeenCalledOnce();
    });

    it("has no Back button without backTo", async () => {
        const header = document.createElement("page-header");
        header.heading = "Groups";
        document.body.append(header);
        await header.updateComplete;

        expect(header.shadowRoot!.querySelector("sl-button")).toBeNull();
    });
});
