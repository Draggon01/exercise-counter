// @vitest-environment happy-dom
import {describe, expect, it} from "vitest";
import "./auth-card";

describe("auth-card", () => {
    it("shows heading, subtitle and slotted form", async () => {
        const card = document.createElement("auth-card");
        card.heading = "Welcome back";
        card.subtitle = "Log in to continue";
        card.innerHTML = "<form id='f'></form>";
        document.body.append(card);
        await card.updateComplete;

        const root = card.shadowRoot!;
        expect(root.querySelector("h1")!.textContent).toBe("Welcome back");
        expect(root.querySelector(".subtitle")!.textContent).toBe("Log in to continue");
        expect((root.querySelector("slot:not([name])") as HTMLSlotElement).assignedElements()[0].id).toBe("f");
    });
});
