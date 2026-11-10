// @vitest-environment happy-dom
import {describe, expect, it, vi} from "vitest";
import {validateForm} from "./form";

function form(value: string) {
    const f = document.createElement("form");
    const input = document.createElement("input");
    input.required = true;
    input.value = value;
    f.append(input);
    return f;
}

describe("validateForm", () => {
    it("returns true for a valid form without showing messages", () => {
        const f = form("x");
        const report = vi.spyOn(f, "reportValidity");

        expect(validateForm(f)).toBe(true);
        expect(report).not.toHaveBeenCalled();
    });

    it("returns false and shows messages for an invalid form", () => {
        const f = form("");
        const report = vi.spyOn(f, "reportValidity");

        expect(validateForm(f)).toBe(false);
        expect(report).toHaveBeenCalledOnce();
    });
});
