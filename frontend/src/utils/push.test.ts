import {describe, expect, it} from "vitest";
import {base64UrlToBytes, browserErrorText, hourLabel, PushEnvironment, pushStep, pushSupport, reminderHoursLabel, setupPlatform} from "./push";

const full: PushEnvironment = {hasServiceWorker: true, hasPushManager: true, hasNotification: true, isIos: false, standalone: false};

describe("pushSupport", () => {
    it("is supported with service worker, push and notifications", () => {
        expect(pushSupport(full)).toBe("supported");
    });

    it("installed iPhone app is supported", () => {
        expect(pushSupport({...full, isIos: true, standalone: true})).toBe("supported");
    });

    it("iPhone in Safari has to add the app to the home screen first", () => {
        expect(pushSupport({...full, hasPushManager: false, hasNotification: false, isIos: true})).toBe("install-first");
    });

    it("other browsers without push are unsupported", () => {
        expect(pushSupport({...full, hasPushManager: false})).toBe("unsupported");
        expect(pushSupport({...full, hasServiceWorker: false, isIos: true, standalone: true})).toBe("unsupported");
    });
});

describe("base64UrlToBytes", () => {
    it("decodes base64url without padding", () => {
        expect([...base64UrlToBytes("-_8")]).toEqual([0xfb, 0xff]);
        expect([...base64UrlToBytes("AQID")]).toEqual([1, 2, 3]);
    });

    it("decodes a 65 byte public key", () => {
        const key = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
        const bytes = base64UrlToBytes(key);
        expect(bytes.length).toBe(65);
        expect(bytes[0]).toBe(4);
    });
});

describe("reminderHoursLabel", () => {
    it("uses singular for one hour", () => {
        expect(reminderHoursLabel(1)).toBe("1 hour");
        expect(reminderHoursLabel(6)).toBe("6 hours");
    });
});

describe("setupPlatform", () => {
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
    const macSafari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
    const macChrome = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
    const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    it("iPhone and iPad (also iPadOS posing as a Mac) get the iPhone guide", () => {
        expect(setupPlatform(iphone)).toBe("ios");
        expect(setupPlatform(macSafari, 5)).toBe("ios");
    });

    it("Safari on a Mac", () => {
        expect(setupPlatform(macSafari)).toBe("mac-safari");
    });

    it("Chrome on Android", () => {
        expect(setupPlatform(android)).toBe("android");
    });

    it("Chrome on a computer (also on a Mac) and unknown browsers", () => {
        expect(setupPlatform(windows)).toBe("desktop-chrome");
        expect(setupPlatform(macChrome)).toBe("desktop-chrome");
        expect(setupPlatform("")).toBe("desktop-chrome");
    });
});

describe("hourLabel", () => {
    it("shows full hours with two digits", () => {
        expect(hourLabel(7)).toBe("07:00");
        expect(hourLabel(22)).toBe("22:00");
        expect(hourLabel(0)).toBe("00:00");
    });
});

describe("pushStep", () => {
    it("returns the result of the step", async () => {
        await expect(pushStep("Step", Promise.resolve(42))).resolves.toBe(42);
    });

    it("names the step and the browser's reason when it fails", async () => {
        const error = new DOMException("Registration failed - push service error", "AbortError");
        await expect(pushStep("Subscribing", Promise.reject(error)))
            .rejects.toThrow("Subscribing failed: AbortError – Registration failed - push service error");
    });

    it("fails when the step never finishes", async () => {
        await expect(pushStep("Subscribing", new Promise(() => undefined), 10))
            .rejects.toThrow("Subscribing did not finish – please try again");
    });
});

describe("browserErrorText", () => {
    it("keeps plain messages and texts", () => {
        expect(browserErrorText(new Error("boom"))).toBe("boom");
        expect(browserErrorText("boom")).toBe("boom");
    });
});
