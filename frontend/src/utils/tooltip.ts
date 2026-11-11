/** Where a small tooltip goes so it stays fully inside the visible area. */

export interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface Size {
    width: number;
    height: number;
}

/**
 * Centered above the anchor (a finger on a touch screen covers what is below), below it if there is
 * no room above; moved sideways so it never leaves the visible area.
 *
 * @param area the visible area (e.g. the window without the top bar and the bottom navigation)
 * @param gap  space between anchor and tooltip, and minimum distance to the area's edges
 * @return the tooltip's top-left corner
 */
export function placeTooltip(anchor: Box, tooltip: Size, area: Box, gap = 8): { left: number, top: number } {
    const centered = (anchor.left + anchor.right) / 2 - tooltip.width / 2;
    const maxLeft = area.right - gap - tooltip.width;
    const left = Math.max(area.left + gap, Math.min(centered, maxLeft));

    const above = anchor.top - gap - tooltip.height;
    const below = anchor.bottom + gap;
    const top = above >= area.top + gap || below + tooltip.height > area.bottom - gap ? above : below;
    return {left: Math.round(left), top: Math.round(Math.max(area.top + gap, top))};
}
