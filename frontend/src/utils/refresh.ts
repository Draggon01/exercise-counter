/**
 * "Pull to refresh": the app shell asks the current page to reload its data. Pages register their
 * loader with {@link onAppRefresh} (in `connectedCallback`, unsubscribe in `disconnectedCallback`).
 */

export const APP_REFRESH_EVENT = "app-refresh";

export interface AppRefreshDetail {
    /** A page hands in what it is loading; the refresh indicator stays until all of it is done. */
    waitUntil(work: Promise<unknown>): void;
}

/** How far (px) the page has to be pulled down to refresh. */
export const PULL_THRESHOLD = 70;

/** Registers a loader for pull to refresh; returns the function that removes it again. */
export function onAppRefresh(load: () => Promise<unknown> | unknown): () => void {
    const listener = (e: Event) => {
        const result = load();
        (e as CustomEvent<AppRefreshDetail>).detail.waitUntil(Promise.resolve(result));
    };
    window.addEventListener(APP_REFRESH_EVENT, listener);
    return () => window.removeEventListener(APP_REFRESH_EVENT, listener);
}

/** Asks all registered pages to reload; resolves when they are done (failures are toasted by the slices). */
export async function requestAppRefresh(): Promise<void> {
    const work: Promise<unknown>[] = [];
    window.dispatchEvent(new CustomEvent<AppRefreshDetail>(APP_REFRESH_EVENT, {
        detail: {waitUntil: p => work.push(p)},
    }));
    await Promise.allSettled(work);
}

/** The finger's way down turned into the indicator's way: follows 1:2, never more than 1.5 × the threshold. */
export function pullDistance(fingerDistance: number): number {
    if (fingerDistance <= 0) return 0;
    return Math.min(fingerDistance / 2, PULL_THRESHOLD * 1.5);
}
