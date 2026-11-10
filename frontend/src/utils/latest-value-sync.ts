/**
 * Saves a value per key (e.g. "done" per exercise) so fast clicks do not flood the server:
 * the UI shows the wanted value at once, at most one request per key is running, and when it
 * returns only the latest wanted value is sent – clicking on/off/on quickly ends as "on" after
 * at most two requests.
 */
export class LatestValueSync<T> {
    private readonly wanted = new Map<string, T>();
    private readonly running = new Set<string>();

    /**
     * @param send saves the value; resolves `true` on success, `false` on failure (then the wish is dropped
     *             and the UI falls back to the server's value)
     * @param onChange called when what {@link pending} returns changes (to re-render)
     */
    constructor(private readonly send: (key: string, value: T) => Promise<boolean>,
                private readonly onChange: () => void = () => undefined) {
    }

    /** The value the user wants but the server does not have yet, `undefined` if nothing is pending. */
    pending(key: string): T | undefined {
        return this.wanted.get(key);
    }

    /**
     * @param saved the value the server has right now
     */
    set(key: string, value: T, saved: T): void {
        this.wanted.set(key, value);
        this.onChange();
        if (!this.running.has(key)) {
            void this.run(key, saved);
        }
    }

    private async run(key: string, saved: T) {
        this.running.add(key);
        let confirmed = saved;
        try {
            while (this.wanted.has(key) && this.wanted.get(key) !== confirmed) {
                const value = this.wanted.get(key) as T;
                if (!await this.send(key, value)) {
                    break;
                }
                confirmed = value;
            }
        } finally {
            this.wanted.delete(key);
            this.running.delete(key);
            this.onChange();
        }
    }
}
