import type {ReactiveController, ReactiveControllerHost} from "lit";
import {vibrate} from "./preferences";
import {dropIndex, shiftFor} from "./reorder";
import {scrollParent} from "./scroll";

/** State of a running drag: positions are relative to the list's top, so scrolling does not matter. */
interface DragState {
    pointerId: number;
    from: number;
    to: number;
    startY: number;
    items: HTMLElement[];
    centers: number[];
    /** height of the dragged item + gap = how far the others move to make room */
    step: number;
    list: HTMLElement;
    scroller?: HTMLElement;
}

export interface SortableOptions {
    /** CSS selector of the items inside the list. */
    items: string;
    /** Sorting is possible right now (default: always). */
    enabled?: () => boolean;
    /** The item was dropped at a new place; resolves when the new order is shown (or could not be saved). */
    move: (from: number, to: number) => Promise<unknown>;
}

/**
 * Sorts a vertical list by drag & drop with pointer events. Items need a grip with `data-drag-handle`
 * (`<exercise-sort-controls>`), the list `@pointerdown="${this.sortable.start}"`. The dragged item gets the attribute
 * `dragging`.
 */
export class SortableController implements ReactiveController {

    private drag?: DragState;

    constructor(private readonly host: ReactiveControllerHost, private readonly options: SortableOptions) {
        host.addController(this);
    }

    hostDisconnected() {
        this.cancel();
    }

    readonly start = (e: PointerEvent) => {
        if (this.options.enabled?.() === false || this.drag || (e.pointerType === "mouse" && e.button !== 0)) return;
        const path = e.composedPath() as HTMLElement[];
        if (!path.some(el => el.dataset?.dragHandle !== undefined)) return;
        const list = e.currentTarget as HTMLElement;
        const items = [...list.querySelectorAll<HTMLElement>(this.options.items)];
        const from = items.findIndex(item => path.includes(item));
        if (from < 0) return;
        e.preventDefault();
        const listTop = list.getBoundingClientRect().top;
        const rects = items.map(item => item.getBoundingClientRect());
        const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 0;
        this.drag = {
            pointerId: e.pointerId, from, to: from, startY: e.clientY - listTop, list, items,
            centers: rects.map(r => r.top - listTop + r.height / 2),
            step: rects[from].height + gap,
            scroller: scrollParent(list),
        };
        items[from].toggleAttribute("dragging", true);
        items.forEach((item, i) => item.style.transition = i === from ? "none" : "transform 0.15s ease");
        window.addEventListener("pointermove", this.pointerMove);
        window.addEventListener("pointerup", this.end);
        window.addEventListener("pointercancel", this.cancel);
    }

    private pointerMove = (e: PointerEvent) => {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;
        const dy = e.clientY - drag.list.getBoundingClientRect().top - drag.startY;
        drag.to = dropIndex(drag.centers, drag.from, drag.centers[drag.from] + dy);
        drag.items.forEach((item, i) => {
            item.style.transform = i === drag.from
                ? `translateY(${dy}px)`
                : `translateY(${shiftFor(i, drag.from, drag.to) * drag.step}px)`;
        });
        this.autoScroll(drag, e.clientY);
    }

    /** Scrolls the page while the item is dragged near the top or bottom edge. */
    private autoScroll(drag: DragState, y: number) {
        if (!drag.scroller) return;
        const box = drag.scroller.getBoundingClientRect();
        const edge = 60;
        if (y < box.top + edge) drag.scroller.scrollBy(0, -12);
        else if (y > box.bottom - edge) drag.scroller.scrollBy(0, 12);
    }

    private end = async (e: PointerEvent) => {
        const drag = this.drag;
        if (!drag || e.pointerId !== drag.pointerId) return;
        this.removeListeners();
        if (drag.to !== drag.from) {
            vibrate(10);
            await this.options.move(drag.from, drag.to);
            await this.host.updateComplete; // the new order is shown now – remove the offsets without animation
        }
        this.reset(drag);
    }

    private cancel = () => {
        if (!this.drag) return;
        this.removeListeners();
        this.reset(this.drag);
    }

    private removeListeners() {
        window.removeEventListener("pointermove", this.pointerMove);
        window.removeEventListener("pointerup", this.end);
        window.removeEventListener("pointercancel", this.cancel);
    }

    private reset(drag: DragState) {
        drag.items.forEach(item => {
            item.style.transition = "";
            item.style.transform = "";
            item.removeAttribute("dragging");
        });
        this.drag = undefined;
    }
}
