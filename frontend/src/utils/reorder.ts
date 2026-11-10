/** Helpers for sorting a vertical list by drag & drop (pure – the DOM work stays in the view). */

/** A copy of {@code list} with the item at {@code from} moved to {@code to}. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
    const result = [...list];
    if (from < 0 || from >= list.length) return result;
    const [item] = result.splice(from, 1);
    result.splice(Math.max(0, Math.min(to, result.length)), 0, item);
    return result;
}

/**
 * Where the dragged item lands: the number of other items whose (original) center is above the
 * dragged item's current center.
 * @param centers vertical centers of all items before the drag, top to bottom
 * @param from index of the dragged item
 * @param draggedCenter current vertical center of the dragged item (same coordinate system)
 */
export function dropIndex(centers: readonly number[], from: number, draggedCenter: number): number {
    return centers.filter((center, i) => i !== from && center < draggedCenter).length;
}

/**
 * How far (in units of the dragged item's height incl. gap) the item at {@code index} has to move
 * to make room while the item {@code from} hovers at {@code to}: -1 up, 1 down, 0 stay.
 */
export function shiftFor(index: number, from: number, to: number): -1 | 0 | 1 {
    if (index === from) return 0;
    if (from < to && index > from && index <= to) return -1;
    if (to < from && index >= to && index < from) return 1;
    return 0;
}
