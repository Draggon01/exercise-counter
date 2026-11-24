import {css, html, LitElement} from "lit";
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
        }

        .no-finisher {
            color: var(--app-text-subtle);
        }
    `;

    @property({attribute: false})
    checks: CheckDto[] = [];

    render() {
        return html`
            <span>Finished by</span>
            ${this.checks.length === 0
                    ? html`<span class="no-finisher">nobody yet</span>`
                    : this.checks.map(check => html`
                        <span class="finisher">${check.user}${check.streak > 1 ? ` 🔥${check.streak}` : ""}</span>
                    `)}
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-finishers": ExerciseFinishers;
    }
}
