import {describe, expect, it} from "vitest";
import {DEFAULT_TIMER_SOUND, isTimerSound, soundNotes, TIMER_SOUNDS} from "./sounds";

describe("timer sounds", () => {
    it("every preset except 'none' has notes", () => {
        for (const sound of TIMER_SOUNDS) {
            expect(soundNotes(sound.id).length > 0).toBe(sound.id !== "none");
        }
    });

    it("the default is the classic three beeps", () => {
        expect(DEFAULT_TIMER_SOUND).toBe("beeps");
        expect(soundNotes("beeps")).toHaveLength(3);
    });

    it("recognizes stored values", () => {
        expect(isTimerSound("bell")).toBe(true);
        expect(isTimerSound("trumpet")).toBe(false);
        expect(isTimerSound(null)).toBe(false);
    });

    it("notes are short enough not to annoy", () => {
        for (const sound of TIMER_SOUNDS) {
            for (const note of soundNotes(sound.id)) {
                expect(note.at + note.length).toBeLessThanOrEqual(2.5);
            }
        }
    });
});
