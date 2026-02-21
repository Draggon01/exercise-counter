import {LitRouter} from "./lit-router";
import {store} from "./store";
import {checkAuthStatus} from "./othrSlices/auth/authSlice";

// Conditional ESM module loading (Node.js and browser)
// @ts-ignore: Property 'UrlPattern' does not exist
if (!globalThis.URLPattern) {
    await import("urlpattern-polyfill");
}

const litElement = new LitRouter()
document.body.append(litElement);

export const CustomRouter = litElement.router;

const HEALTH_CHECK_INTERVAL = 30000; // milliseconds

setInterval(() => {
    store.dispatch(checkAuthStatus());
}, HEALTH_CHECK_INTERVAL);

// Also check on app init
store.dispatch(checkAuthStatus());