import {describe, expect, it} from "vitest";
import {formatMegabytes, mediaProblem} from "./media-file";

const MB = 1024 * 1024;
const limits = {maxVideoBytes: 90 * MB, maxPhotoBytes: 20 * MB, maxSeconds: 15};
const problem = (type: string, size = 1, seconds?: number) => mediaProblem({type, size}, seconds, limits);

describe("media file", () => {
    it("accepts videos and photos within the limits", () => {
        expect(problem("video/mp4", 90 * MB, 15.9)).toBeUndefined();
        expect(problem("image/jpeg", 20 * MB)).toBeUndefined();
        expect(problem("", 5)).toBeUndefined(); // unknown to the browser: the server decides
    });

    it("says what is wrong", () => {
        expect(problem("video/mp4", 91 * MB)).toContain("at most 90 MB");
        expect(problem("image/png", 21 * MB)).toContain("at most 20 MB");
        expect(problem("video/quicktime", 1, 20)).toContain("20 seconds");
        expect(problem("image/heic")).toContain("HEIC");
        expect(problem("application/pdf")).toContain("video or a photo");
    });

    it("formats sizes", () => {
        expect([0, 0.36 * MB, 5 * MB, 50 * MB, 12.4 * MB].map(formatMegabytes)).toEqual(["0 MB", "0.4 MB", "5 MB", "50 MB", "12 MB"]);
    });
});
