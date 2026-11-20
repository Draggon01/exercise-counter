import {describe, expect, it} from "vitest";
import {matchesSearch} from "./search";

describe("matchesSearch", () => {
    it("an empty search matches everything", () => {
        expect(matchesSearch("Push-ups", "")).toBe(true);
        expect(matchesSearch("Push-ups", "   ")).toBe(true);
    });

    it("ignores case and accents", () => {
        expect(matchesSearch("Push-ups", "PUSH")).toBe(true);
        expect(matchesSearch("Übungen am Morgen", "ubung")).toBe(true);
        expect(matchesSearch("Klimmzüge", "KLIMMZUGE")).toBe(true);
    });

    it("every word must appear, in any order", () => {
        expect(matchesSearch("Push-ups", "push up")).toBe(true);
        expect(matchesSearch("Morning plank", "plank morn")).toBe(true);
        expect(matchesSearch("Morning plank", "plank evening")).toBe(false);
    });
});
