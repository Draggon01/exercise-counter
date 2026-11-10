import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {ExerciseDto} from "../models/exerciseDto";
import {isRepExercise, isTimeExercise} from "../../../utils/exercise";
import {formatDuration} from "../../../utils/format";

/** Events of `<browse-card>`; detail is the {@link ExerciseDto}. */
export const BrowseCardEvents = {
    select: "select-exercise",
} as const;

/**
 * One exercise in the browse list: title, creator and goal, and a button to add it to the home page.
 */
@customElement("browse-card")
export class BrowseCard extends LitElement {
    static styles = css`
        :host {
            display: block;
        }

        .card {
            display: flex;
            align-items: center;
            gap: var(--app-space-3);
            padding: var(--app-space-3) var(--app-space-4);
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius);
            background: var(--app-surface);
            box-shadow: var(--app-shadow);
        }

        .text {
            flex: 1;
            min-width: 0;
        }

        .headline {
            margin: 0;
            font-size: 1.05em;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .meta {
            margin-top: 2px;
            font-size: 0.85em;
            color: var(--app-text-muted);
        }
    `;

    @property({attribute: false})
    item: ExerciseDto = {exerciseId: "", exerciseTitle: "", creator: ""} as ExerciseDto;

    render() {
        return html`
            <div class="card">
                <div class="text">
                    <h2 class="headline">${this.item.exerciseTitle}</h2>
                    <div class="meta">by ${this.item.creator}${this.goal() ? html` · ${this.goal()}` : ""}</div>
                </div>
                <sl-button variant="primary" size="small" @click="${this.select}">
                    <sl-icon slot="prefix" name="plus-lg"></sl-icon>
                    Add
                </sl-button>
            </div>
        `;
    }

    private goal(): string {
        const value = parseInt(this.item.exerciseValue ?? "", 10);
        if (isNaN(value)) return "";
        if (isTimeExercise(this.item.exerciseType)) return formatDuration(value);
        if (isRepExercise(this.item.exerciseType)) return `${value} reps`;
        return String(value);
    }

    private select = () => {
        this.dispatchEvent(new CustomEvent<ExerciseDto>(BrowseCardEvents.select, {detail: this.item}));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "browse-card": BrowseCard;
    }
}
