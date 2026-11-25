// @vitest-environment happy-dom
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {LoopVideo} from "./loop-video";
import "./loop-video";

describe("loop-video", () => {
    const play = vi.fn(function (this: HTMLMediaElement) { this.dispatchEvent(new Event("play")); return Promise.resolve(); });
    const pause = vi.fn(function (this: HTMLMediaElement) { this.dispatchEvent(new Event("pause")); });

    beforeEach(() => {
        HTMLMediaElement.prototype.play = play as never;
        HTMLMediaElement.prototype.pause = pause as never;
    });
    afterEach(() => document.body.replaceChildren());

    async function show(hasSound = false) {
        const el = document.createElement("loop-video") as LoopVideo;
        el.src = "/api/media/x";
        el.hasSound = hasSound;
        document.body.append(el);
        await el.updateComplete;
        const tap = async (selector: string) => {
            (el.shadowRoot!.querySelector(selector) as HTMLElement).click();
            await el.updateComplete;
        };
        return {el, tap, isPlaying: () => el.shadowRoot!.querySelector(".play") === null,
            video: el.shadowRoot!.querySelector("video")!};
    }

    it("does not load or play by itself; only one plays", async () => {
        const a = await show();
        const b = await show();
        expect(a.video.getAttribute("preload")).toBe("none");
        expect(a.isPlaying()).toBe(false);
        await a.tap(".play");
        expect(a.isPlaying()).toBe(true);
        await b.tap(".play");
        await a.el.updateComplete;
        expect(a.isPlaying()).toBe(false);
        expect(b.isPlaying()).toBe(true);
    });

    it("sound button only with sound, starts off", async () => {
        const silent = await show();
        expect(silent.el.shadowRoot!.querySelector("[label^=Sound]")).toBeNull();
        const clip = await show(true);
        expect(clip.video.muted).toBe(true);
        await clip.tap("[label='Sound on']");
        expect(clip.video.muted).toBe(false);
    });

    it("offers another try when it cannot be loaded", async () => {
        const {el, video} = await show();
        video.dispatchEvent(new Event("error"));
        await el.updateComplete;
        expect(el.shadowRoot!.textContent).toContain("Try again");
    });
});
