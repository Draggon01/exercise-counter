import {css} from "lit";

/**
 * 44×44px tap targets on touch devices for controls that Shoelace sizes without tokens
 * (icon buttons, switches, checkboxes, radio buttons, tab scroll arrows).
 * Add to `static styles` of components that render them; buttons and inputs follow the
 * touch tokens in styles/theme.css.
 */
export const touchStyles = css`
    @media (pointer: coarse) {
        sl-icon-button::part(base),
        sl-tab-group::part(scroll-button__base) {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 44px;
            min-height: 44px;
        }

        sl-tab-group::part(scroll-button) {
            width: 44px;
        }

        sl-switch, sl-checkbox {
            display: inline-flex;
            align-items: center;
            min-height: 44px;
        }

        sl-radio-button::part(button) {
            min-width: 44px;
        }
    }
`;
