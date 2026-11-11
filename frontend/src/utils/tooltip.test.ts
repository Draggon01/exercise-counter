import {describe, expect, it} from "vitest";
import {placeTooltip} from "./tooltip";

const area = {left: 0, top: 56, right: 390, bottom: 600};
const size = {width: 140, height: 40};
const cell = (left: number, top: number) => ({left, top, right: left + 24, bottom: top + 24});

describe("placeTooltip", () => {
    it("is centered above the anchor", () => {
        expect(placeTooltip(cell(180, 300), size, area)).toEqual({left: 122, top: 252});
    });

    it("never leaves the right edge (newest cell of the statistics grid)", () => {
        const {left} = placeTooltip(cell(360, 300), size, area);
        expect(left + size.width).toBeLessThanOrEqual(area.right - 8);
        expect(left).toBe(242);
    });

    it("never leaves the left edge", () => {
        expect(placeTooltip(cell(2, 300), size, area).left).toBe(8);
    });

    it("goes below when there is no room above (under the top bar)", () => {
        expect(placeTooltip(cell(180, 70), size, area).top).toBe(102);
    });

    it("stays above when there is no room below either", () => {
        const tiny = {left: 0, top: 56, right: 390, bottom: 140};
        expect(placeTooltip(cell(180, 80), size, tiny).top).toBe(64);
    });
});
