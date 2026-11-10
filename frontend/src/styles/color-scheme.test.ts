// @vitest-environment happy-dom
import {afterEach, describe, expect, it, vi} from "vitest";
import {applyColorScheme, getColorScheme, setColorScheme} from "./color-scheme";

function osPrefersDark(dark: boolean) {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({matches: dark, addEventListener: vi.fn()}));
}

const isDark = () => document.documentElement.classList.contains("sl-theme-dark");

afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    document.documentElement.classList.remove("sl-theme-dark");
});

describe("color scheme", () => {
    it("defaults to system and follows the OS", () => {
        osPrefersDark(true);
        expect(getColorScheme()).toBe("system");
        expect(applyColorScheme()).toBe(true);
        expect(isDark()).toBe(true);

        osPrefersDark(false);
        applyColorScheme();
        expect(isDark()).toBe(false);
    });

    it("an explicit choice wins over the OS and is remembered", () => {
        osPrefersDark(true);
        setColorScheme("light");
        expect(isDark()).toBe(false);
        expect(getColorScheme()).toBe("light");

        setColorScheme("dark");
        expect(isDark()).toBe(true);
        expect(getColorScheme()).toBe("dark");
    });

    it("going back to system removes the stored choice", () => {
        setColorScheme("dark");
        osPrefersDark(false);

        setColorScheme("system");

        expect(getColorScheme()).toBe("system");
        expect(isDark()).toBe(false);
    });
});
