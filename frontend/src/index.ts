import {LitRouter} from "./lit-router";

// Conditional ESM module loading (Node.js and browser)
// @ts-ignore: Property 'UrlPattern' does not exist
if (!globalThis.URLPattern) {
    await import("urlpattern-polyfill");
}

const litElement = new LitRouter()
document.body.append(litElement);

export const CustomRouter = litElement.router;
