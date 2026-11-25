import {css, html, LitElement, nothing} from "lit";
import {customElement, property} from "lit/decorators.js";
import {formatTarget} from "../../../utils/format";
import "./step-media";
import {ExerciseStepDto} from "../models/exerciseDetailsDto";

/** One step of an exercise: title, how often / long, hints. */
@customElement("exercise-step")
export class ExerciseStep extends LitElement {

    static styles = css`
        :host {
            display: block;
            box-sizing: border-box;
            padding: var(--app-space-4);
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius);
            background: var(--app-surface);
            box-shadow: var(--app-shadow);
        }

        step-media {
            margin-bottom: var(--app-space-3);
        }

        /* computers: picture left, text right */
        @media (min-width: 769px) {
            .with-media {
                display: grid;
                grid-template-columns: 260px 1fr;
                gap: var(--app-space-4);
            }

            .with-media step-media {
                margin: 0;
            }
        }

        h3 {
            margin: 0;
            font-size: 1.05em;
            font-weight: 600;
            overflow-wrap: anywhere;
        }

        .target {
            margin-top: 2px;
            color: var(--app-accent);
            font-weight: 600;
        }

        .hints {
            margin: var(--app-space-2) 0 0;
            color: var(--app-text-muted);
            white-space: pre-line;
            overflow-wrap: anywhere;
        }
    `;

    @property({attribute: false})
    step!: ExerciseStepDto;

    /** 0: not shown */
    @property({type: Number})
    number = 1;

    render() {
        const target = formatTarget(this.step);
        const media = this.step.media?.status === "FAILED" ? null : this.step.media;
        return html`
            <div class="${media ? "with-media" : ""}">
                ${media ? html`<step-media .media="${media}" .label="${this.step.title}"></step-media>` : nothing}
                <div>
                    <h3>${this.number ? `${this.number}. ` : ""}${this.step.title}</h3>
                    ${target ? html`<div class="target">${target}</div>` : nothing}
                    ${this.step.hints ? html`<p class="hints">${this.step.hints}</p>` : nothing}
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-step": ExerciseStep;
    }
}
