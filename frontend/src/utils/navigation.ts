/**
 * Navigates inside the single page app: updates the URL and lets the routers react (popstate).
 */
export function navigate(path: string) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Pages a sub page may lead back to instead of home. */
const BACK_TARGETS = /^\/(browse|exercises\/[\w-]+)$/;

/** `path`, whose Back button then leads to `back` (read with {@link backPath}). */
export const withBack = (path: string, back: string) => `${path}?back=${encodeURIComponent(back)}`;

/** Where Back leads on the current page: the page it was opened from ({@link withBack}), otherwise home. */
export function backPath(search: string = window.location.search): string {
    const back = new URLSearchParams(search).get("back") ?? "";
    return BACK_TARGETS.test(back) ? back : "/";
}
