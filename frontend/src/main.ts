/** Shoelace: theme + the used components (registered globally, so views do not import single components). */
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import './shoelace';
import './styles/theme.css';
import {initColorScheme} from './styles/color-scheme';

initColorScheme();

// Installable app: the service worker caches the app shell (see public/sw.js). Only in production builds,
// so the dev server never serves stale files.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(error => console.warn("Service worker not registered", error));
    });
}
