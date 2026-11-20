/**
 * Per-device preferences (localStorage, like the color scheme): they depend on the device
 * (a phone vibrates, a laptop does not), so they are not stored in the backend options.
 */
import {DEFAULT_TIMER_SOUND, isTimerSound, TimerSound} from "./sounds";

const SOUND_KEY = "exercise-counter.timer-sound";
const VIBRATION_KEY = "exercise-counter.vibration";

function read(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null; // storage blocked (private mode)
    }
}

function write(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage blocked: the choice only lasts for this page
    }
}

export function getTimerSound(): TimerSound {
    const stored = read(SOUND_KEY);
    return isTimerSound(stored) ? stored : DEFAULT_TIMER_SOUND;
}

export function setTimerSound(sound: TimerSound) {
    write(SOUND_KEY, sound);
}

/** Vibration on by default. */
export function isVibrationOn(): boolean {
    return read(VIBRATION_KEY) !== "off";
}

export function setVibrationOn(on: boolean) {
    write(VIBRATION_KEY, on ? "on" : "off");
}

/** Vibrates (if the device can and the user did not turn it off in Options). */
export function vibrate(pattern: number | number[]) {
    if (isVibrationOn()) {
        navigator.vibrate?.(pattern);
    }
}
