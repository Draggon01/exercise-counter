import {css, html, LitElement} from "lit";
import {customElement} from "lit/decorators.js";
import {touchStyles} from "../../../styles/touch";

/**
 * Edit order: grip handle (dragged by the home view with pointer events) and arrows for keyboard / screen readers.
 * Events `move-up` / `move-down`, without detail.
 */
@customElement("exercise-sort-controls")
export class ExerciseSortControls extends LitElement {

    static styles = [touchStyles, css`
        :host {
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        .drag-handle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 44px;
            min-height: 44px;
            font-size: 1.25rem;
            color: var(--app-text-muted);
            cursor: grab;
            /* the finger drags the card instead of scrolling the page */
            touch-action: none;
            user-select: none;
        }

        .drag-handle:active {
            cursor: grabbing;
        }

        sl-icon-button {
            font-size: 1.1rem;
            color: var(--app-text-subtle);
        }
    `];

    render() {
        return html`
            <span class="drag-handle" data-drag-handle title="Drag to move"><sl-icon name="grip-vertical"></sl-icon></span>
            <sl-icon-button name="arrow-up" label="Move up" @click="${() => this.emit("move-up")}"></sl-icon-button>
            <sl-icon-button name="arrow-down" label="Move down" @click="${() => this.emit("move-down")}"></sl-icon-button>
        `;
    }

    private emit(type: string) {
        this.dispatchEvent(new CustomEvent(type));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-sort-controls": ExerciseSortControls;
    }
}
