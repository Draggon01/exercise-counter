/**
 * Navigates inside the single page app: updates the URL and lets the routers react (popstate).
 */
export function navigate(path: string) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Pages a sub page may lead back to instead of home. */
const BACK_TARGETS = /^\/(browse|exercises\/[\w-]+(\/content)?)$/;

/** `path`, whose Back button then leads to `back` (read with {@link backPath}). */
export const withBack = (path: string, back: string) => `${path}?back=${encodeURIComponent(back)}`;

/** Where Back leads on the current page: the page it was opened from ({@link withBack}), otherwise home. */
export function backPath(search: string = window.location.search): string {
    const back = new URLSearchParams(search).get("back") ?? "";
    return BACK_TARGETS.test(back) ? back : "/";
}

/** A normal click on a link (not e.g. "open in new tab"), which the app handles itself. */
export const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey;

/** Pages outside the app shell, shown without a login. */
export const isPublicPage = (path: string) => /^\/(login|register\/.+|reset-password\/.+)$/.test(path);
