/**
 * Preset sounds played when a timer finishes, made with the Web Audio API (no audio files to download).
 * Own (uploaded) sounds are planned for later.
 */
export const TIMER_SOUNDS = [
    {id: "beeps", label: "Beeps"},
    {id: "bell", label: "Bell"},
    {id: "chime", label: "Chime"},
    {id: "fanfare", label: "Fanfare"},
    {id: "none", label: "No sound"},
] as const;

export type TimerSound = typeof TIMER_SOUNDS[number]["id"];

export const DEFAULT_TIMER_SOUND: TimerSound = "beeps";

export function isTimerSound(value: unknown): value is TimerSound {
    return TIMER_SOUNDS.some(sound => sound.id === value);
}

/** One note: start (s after now), frequency (Hz), length (s), waveform. */
export type Note = { at: number, frequency: number, length: number, type: OscillatorType };

/** The notes of a sound (empty for "none"). */
export function soundNotes(sound: TimerSound): Note[] {
    switch (sound) {
        case "beeps":
            return [0, 0.4, 0.8].map(at => ({at, frequency: 880, length: 0.3, type: "sine"}));
        case "bell":
            // a struck bell: base tone with a quieter overtone, long decay, twice
            return [0, 1.2].flatMap(at => [
                {at, frequency: 659, length: 1.1, type: "sine" as const},
                {at, frequency: 1318, length: 0.6, type: "sine" as const},
            ]);
        case "chime":
            // falling triad, like a doorbell
            return [1047, 784, 523].map((frequency, i) => ({at: i * 0.35, frequency, length: 0.7, type: "triangle"}));
        case "fanfare":
            // rising, short – long
            return [523, 659, 784].map((frequency, i) => ({at: i * 0.15, frequency, length: 0.14, type: "square" as const}))
                .concat({at: 0.45, frequency: 1047, length: 0.6, type: "square"});
        case "none":
            return [];
    }
}

export function playTimerSound(sound: TimerSound) {
    const notes = soundNotes(sound);
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx || notes.length === 0) return;
    const ctx = new AudioCtx();
    const end = Math.max(...notes.map(note => note.at + note.length));
    notes.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = note.type;
        const start = ctx.currentTime + note.at;
        osc.frequency.setValueAtTime(note.frequency, start);
        // square waves are loud: quieter
        gain.gain.setValueAtTime(note.type === "square" ? 0.15 : 0.5, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + note.length);
        osc.start(start);
        osc.stop(start + note.length + 0.05);
    });
    setTimeout(() => void ctx.close(), (end + 0.2) * 1000);
}
