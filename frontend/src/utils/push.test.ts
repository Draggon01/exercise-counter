import {describe, expect, it} from "vitest";
import {base64UrlToBytes, PushEnvironment, pushSupport, reminderHoursLabel} from "./push";

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
