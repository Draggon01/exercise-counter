import {css} from "lit";

/**
 * Layout of a page (view): a centered column of --app-page-max-width with token spacing.
 * Use in a view as `static styles = [pageStyles, css`...`]` and wrap the content in
 * `<div class="page-container">`. Breakpoint: 768px (mobile).
 */
export const pageStyles = css`
    :host {
        display: block;
        box-sizing: border-box;
        padding: var(--app-space-4);
    }

    .page-container {
        width: 100%;
        max-width: var(--app-page-max-width);
        margin: 0 auto;
        box-sizing: border-box;
    }

    @media (max-width: 768px) {
        :host {
            padding: var(--app-space-3);
        }
    }
`;
