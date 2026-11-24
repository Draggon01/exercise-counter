import {css} from "lit";

/** What the exercise cards of the home page share: frame, title, subtitle, streak, look while dragged. */
export const cardStyles = css`
    :host {
        display: block;
    }

    /* lifted while it is dragged to a new place (home view, edit order) */
    :host([dragging]) {
        position: relative;
        z-index: 5;
    }

    :host([dragging]) .card {
        box-shadow: var(--app-shadow-raised);
        border-color: var(--app-accent);
    }

    .card {
        box-sizing: border-box;
        width: 100%;
        padding: var(--app-space-3) var(--app-space-4);
        border: 1px solid var(--app-border);
        border-left: 4px solid var(--app-border);
        border-radius: var(--app-radius);
        background: var(--app-surface);
        box-shadow: var(--app-shadow);
        transition: border-color 0.2s;
    }

    .card.done {
        border-left-color: var(--app-success);
    }

    .headline {
        margin: 0;
        font-size: 1.1em;
        font-weight: 600;
        line-height: 1.3;
        color: var(--app-text);
        overflow-wrap: anywhere;
    }

    .done .headline {
        color: var(--app-text-muted);
    }

    .subtitle {
        display: flex;
        flex-wrap: wrap;
        gap: var(--app-space-1) var(--app-space-2);
        margin-top: 2px;
        font-size: 0.85em;
        color: var(--app-text-muted);
    }

    .urgent {
        color: var(--app-warning);
        font-weight: 600;
    }

    .streak {
        padding: 2px var(--app-space-2);
        border-radius: var(--app-radius-pill);
        background: var(--app-warning-soft);
        color: var(--app-warning);
        font-size: 0.8em;
        font-weight: 600;
        white-space: nowrap;
    }

    .reminder-icon {
        align-self: center;
        color: var(--app-text-subtle);
    }

    @media (max-width: 400px) {
        .card {
            padding: var(--app-space-3);
        }
    }
`;
