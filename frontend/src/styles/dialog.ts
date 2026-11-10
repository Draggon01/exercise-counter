import {css} from "lit";

/**
 * Dialogs with forms or longer content fill the screen on phones (≤ 768px): more room, buttons
 * reachable, no tiny box over a page. Add to `static styles` of components that render such a
 * `<sl-dialog>`. Short confirmations (confirm-dialog) stay compact on purpose.
 */
export const fullscreenDialogStyles = css`
    @media (max-width: 768px) {
        sl-dialog {
            --width: 100vw;
        }

        sl-dialog::part(panel) {
            width: 100vw;
            max-width: 100vw;
            height: 100dvh;
            max-height: 100dvh;
            border-radius: 0;
        }

        sl-dialog::part(header) {
            padding-top: env(safe-area-inset-top);
        }

        sl-dialog::part(footer) {
            padding-bottom: calc(var(--sl-spacing-large) + env(safe-area-inset-bottom));
        }
    }
`;
