import {describe, expect, it} from "vitest";
import {backPath, withBack} from "./navigation";

const search = (path: string) => path.slice(path.indexOf("?"));

describe("backPath", () => {
    it("leads back to where the page was opened from", () => {
        expect(backPath(search(withBack("/statistics/1", "/exercises/1-a")))).toBe("/exercises/1-a");
        expect(backPath(search(withBack("/exercises/1", "/browse")))).toBe("/browse");
    });

    it("leads home otherwise", () => {
        expect(backPath("")).toBe("/");
        for (const path of ["https://evil.example", "//evil.example", "/login", "/exercises/1/../../login", "/browse?x"]) {
            expect(backPath(search(withBack("/statistics/1", path)))).toBe("/");
        }
    });
});
