import {css} from "lit";

/**
 * Rows of the options page: label + description on the left, the control (switch, select, button) on
 * the right. Markup: `<div class="setting-row"><div><div class="setting-label">…</div>
 * <div class="setting-description">…</div></div> control </div>`; `.setting-control` gives selects a fixed width.
 */
export const settingStyles = css`
    .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
    }

    .setting-label {
        font-size: 0.9rem;
    }

    .setting-description {
        font-size: 0.8rem;
        color: var(--app-text-muted);
        margin-top: 2px;
    }

    .setting-control {
        width: 140px;
        flex-shrink: 0;
    }
`;
