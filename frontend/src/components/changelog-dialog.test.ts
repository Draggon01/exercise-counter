// @vitest-environment happy-dom
import {describe, expect, it, vi} from "vitest";
import "./changelog-dialog";
import {ChangelogEntry} from "../shared-slices/changelog/changelogSlice";

const entries: ChangelogEntry[] = [
    {version: "0.7", date: "2026-11-10", title: "Fresh look", items: ["Dark mode", "<b>No HTML</b>"]},
    {version: "0.6", date: "2026-05-07", title: "Missed entries", items: ["Backfill"]},
];

describe("changelog-dialog", () => {
    it("renders every entry with version, title, date and items as text", async () => {
        const dialog = document.createElement("changelog-dialog");
        dialog.entries = entries;
        dialog.open = true;
        document.body.append(dialog);
        await dialog.updateComplete;
        const list = dialog.shadowRoot!.querySelector("changelog-entries")!;
        await list.updateComplete;

        const articles = list.shadowRoot!.querySelectorAll("article");
        expect(articles).toHaveLength(2);
        expect(articles[0].querySelector(".version")!.textContent).toBe("v0.7");
        expect(articles[0].querySelector("h3")!.textContent).toBe("Fresh look");
        expect(articles[0].querySelector("time")!.textContent).toBe("2026-11-10");
        expect([...articles[0].querySelectorAll("li")].map(li => li.textContent)).toEqual(["Dark mode", "<b>No HTML</b>"]);
        expect(articles[0].querySelector("b")).toBeNull();
    });

    it("emits close on 'Got it' and when dismissed", async () => {
        const dialog = document.createElement("changelog-dialog");
        dialog.entries = entries;
        dialog.open = true;
        document.body.append(dialog);
        await dialog.updateComplete;
        const onClose = vi.fn();
        dialog.addEventListener("close", onClose);

        (dialog.shadowRoot!.querySelector("sl-button") as HTMLElement).click();
        dialog.shadowRoot!.querySelector("sl-dialog")!.dispatchEvent(new CustomEvent("sl-request-close"));

        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
