import {describe, expect, it} from "vitest";
import {dropIndex, moveItem, shiftFor} from "./reorder";

describe("moveItem", () => {
    it("moves down", () => expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]));
    it("moves up", () => expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]));
    it("same place keeps the order", () => expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]));
    it("clamps the target", () => expect(moveItem(["a", "b", "c"], 0, 99)).toEqual(["b", "c", "a"]));
    it("ignores an invalid source", () => expect(moveItem(["a", "b"], 5, 0)).toEqual(["a", "b"]));
    it("does not change the input", () => {
        const list = ["a", "b"];
        moveItem(list, 0, 1);
        expect(list).toEqual(["a", "b"]);
    });
});

describe("dropIndex", () => {
    const centers = [50, 150, 250, 350];

    it("stays in place without moving", () => expect(dropIndex(centers, 1, 150)).toBe(1));
    it("passes the next item once its center is crossed", () => {
        expect(dropIndex(centers, 1, 249)).toBe(1);
        expect(dropIndex(centers, 1, 251)).toBe(2);
    });
    it("goes to the top", () => expect(dropIndex(centers, 3, 0)).toBe(0));
    it("goes to the bottom", () => expect(dropIndex(centers, 0, 999)).toBe(3));
});

describe("shiftFor", () => {
    it("dragging down moves the items in between up", () => {
        expect([0, 1, 2, 3].map(i => shiftFor(i, 0, 2))).toEqual([0, -1, -1, 0]);
    });
    it("dragging up moves the items in between down", () => {
        expect([0, 1, 2, 3].map(i => shiftFor(i, 3, 1))).toEqual([0, 1, 1, 0]);
    });
    it("nothing moves while the item is at its own place", () => {
        expect([0, 1, 2].map(i => shiftFor(i, 1, 1))).toEqual([0, 0, 0]);
    });
});
