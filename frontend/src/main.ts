/** Shoelace: theme + all components (registered globally, so views do not import single components). */
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import '@shoelace-style/shoelace/dist/shoelace.js';
import './styles/theme.css';
import {initColorScheme} from './styles/color-scheme';

initColorScheme();
