import {describe, expect, it} from "vitest";
import {newPasswordProblem} from "./password";

describe("newPasswordProblem", () => {
    it("accepts 8+ characters typed twice", () => {
        expect(newPasswordProblem("abcdefgh", "abcdefgh")).toBeUndefined();
    });

    it("rejects short passwords", () => {
        expect(newPasswordProblem("abc", "abc")).toContain("at least 8");
    });

    it("rejects different repetitions", () => {
        expect(newPasswordProblem("abcdefgh", "abcdefgX")).toBe("The passwords do not match.");
    });
});
