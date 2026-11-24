// @vitest-environment happy-dom
import {afterEach, describe, expect, it, vi} from "vitest";
import {SortableController} from "./sortable";

function setup(enabled = true) {
    const move = vi.fn().mockResolvedValue(undefined);
    const host = {addController: vi.fn(), removeController: vi.fn(), requestUpdate: vi.fn(), updateComplete: Promise.resolve(true)};
    const sortable = new SortableController(host, {items: ".item", enabled: () => enabled, move});
    const list = document.createElement("div");
    list.innerHTML = [0, 1, 2].map(() => `<div class="item"><span data-drag-handle>grip</span><b>text</b></div>`).join("");
    list.getBoundingClientRect = () => ({top: 0}) as DOMRect;
    list.querySelectorAll<HTMLElement>(".item").forEach((item, i) =>
        item.getBoundingClientRect = () => ({top: i * 60, bottom: i * 60 + 50, height: 50}) as DOMRect);
    list.addEventListener("pointerdown", sortable.start as EventListener);
    document.body.append(list);
    const fire = (target: EventTarget, type: string, y: number) =>
        target.dispatchEvent(new PointerEvent(type, {bubbles: true, composed: true, clientY: y, pointerId: 1, pointerType: "touch"}));
    return {list, move, sortable, fire, items: [...list.querySelectorAll<HTMLElement>(".item")]};
}

describe("SortableController", () => {
    afterEach(() => document.body.replaceChildren());

    it("drags the item by its grip to a new place", async () => {
        const {items, move, fire} = setup();
        fire(items[0].querySelector("span")!, "pointerdown", 25);
        expect(items[0].hasAttribute("dragging")).toBe(true);
        fire(window, "pointermove", 150);
        fire(window, "pointerup", 150);

        expect(move).toHaveBeenCalledWith(0, 2);
        await vi.waitFor(() => expect(items[0].hasAttribute("dragging")).toBe(false));
        expect(items[1].style.transform).toBe("");
    });

    it("does nothing outside the grip, when disabled or when dropped at its place", () => {
        const {items, move, fire} = setup();
        fire(items[0].querySelector("b")!, "pointerdown", 25);
        fire(items[0].querySelector("span")!, "pointerdown", 25);
        fire(window, "pointerup", 25);
        const off = setup(false);
        off.fire(off.items[0].querySelector("span")!, "pointerdown", 25);

        expect(move).not.toHaveBeenCalled();
        expect(off.items[0].hasAttribute("dragging")).toBe(false);
    });

    it("removing the host ends the drag", () => {
        const {items, move, fire, sortable} = setup();
        fire(items[0].querySelector("span")!, "pointerdown", 25);
        sortable.hostDisconnected();
        fire(window, "pointerup", 150);

        expect(items[0].hasAttribute("dragging")).toBe(false);
        expect(move).not.toHaveBeenCalled();
    });
});
