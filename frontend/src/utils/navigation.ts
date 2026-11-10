/**
 * Navigates inside the single page app: updates the URL and lets the routers react (popstate).
 */
export function navigate(path: string) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
}
