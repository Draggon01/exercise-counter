/** The nearest scrolling ancestor, also across shadow roots and slots (the app shell's main). */
export function scrollParent(el: HTMLElement): HTMLElement | undefined {
    let node: Element | null = el;
    while (node) {
        const next: Element | null = node.assignedSlot ?? node.parentElement ?? ((node.getRootNode() as ShadowRoot).host ?? null);
        if (next instanceof HTMLElement && /(auto|scroll)/.test(getComputedStyle(next).overflowY)) return next;
        node = next;
    }
    return undefined;
}
