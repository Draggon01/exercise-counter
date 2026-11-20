import {describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

/** public/.well-known/security.txt (RFC 9116) must stay valid – an expired file is treated as stale. */
const text = readFileSync(fileURLToPath(new URL("../public/.well-known/security.txt", import.meta.url)), "utf8");
const field = (name: string) => text.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1];

describe("security.txt", () => {
    it("has a contact", () => {
        expect(field("Contact")).toMatch(/^(https:|mailto:)/);
    });

    it("expires in the future, at most one year ahead – renew it when this fails (30 days before)", () => {
        const expires = Date.parse(field("Expires") ?? "");
        const day = 24 * 3600 * 1000;
        expect(expires - Date.now()).toBeGreaterThan(30 * day);
        expect(expires - Date.now()).toBeLessThan(366 * day);
    });
});
