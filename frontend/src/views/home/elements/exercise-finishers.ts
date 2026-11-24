import {css, html, LitElement, nothing} from "lit";
import {customElement, property} from "lit/decorators.js";
import {CheckDto} from "../models/checkDto";

/** "Finished by": who finished an exercise in the current period, with their streaks. */
@customElement("exercise-finishers")
export class ExerciseFinishers extends LitElement {

    static styles = css`
        :host {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-1) var(--app-space-2);
            font-size: 0.85em;
            color: var(--app-text-muted);
        }

        .finisher {
            padding: 2px var(--app-space-2);
            border-radius: var(--app-radius-pill);
            background: var(--app-success-soft);
            color: var(--app-success-strong);
            overflow-wrap: anywhere;
        }

        .no-finisher {
            color: var(--app-text-subtle);
        }
    `;

    @property({attribute: false})
    checks: CheckDto[] = [];

    /** Show only the first ones and how many more there are ("+2"); 0 = all. */
    @property({type: Number})
    max = 0;

    render() {
        const shown = this.max > 0 ? this.checks.slice(0, this.max) : this.checks;
        const more = this.checks.length - shown.length;
        return html`
            <span>Finished by</span>
            ${this.checks.length === 0
                    ? html`<span class="no-finisher">nobody yet</span>`
                    : shown.map(check => html`
                        <span class="finisher">${check.user}${check.streak > 1 ? ` 🔥${check.streak}` : ""}</span>
                    `)}
            ${more > 0 ? html`<span class="more" title="${more} more">+${more}</span>` : nothing}
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-finishers": ExerciseFinishers;
    }
}
