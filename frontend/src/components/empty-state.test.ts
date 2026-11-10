// @vitest-environment happy-dom
import {describe, expect, it} from "vitest";
import "./empty-state";

describe("empty-state", () => {
    it("renders icon, heading, text and slotted actions", async () => {
        const empty = document.createElement("empty-state");
        empty.icon = "search";
        empty.heading = "Nothing to browse";
        empty.text = "All exercises are on your list.";
        empty.innerHTML = "<button>Go home</button>";
        document.body.append(empty);
        await empty.updateComplete;

        const root = empty.shadowRoot!;
        expect(root.querySelector("sl-icon")!.getAttribute("name")).toBe("search");
        expect(root.querySelector("h3")!.textContent).toBe("Nothing to browse");
        expect(root.querySelector("p")!.textContent).toBe("All exercises are on your list.");
        expect((root.querySelector("slot") as HTMLSlotElement).assignedElements()[0].textContent).toBe("Go home");
    });

    it("omits the text paragraph when there is no text", async () => {
        const empty = document.createElement("empty-state");
        empty.heading = "Empty";
        document.body.append(empty);
        await empty.updateComplete;

        expect(empty.shadowRoot!.querySelector("p")).toBeNull();
    });
});
