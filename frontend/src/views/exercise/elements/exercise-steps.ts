import {css, html, LitElement, nothing} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";
import {repeat} from "lit/directives/repeat.js";
import {touchStyles} from "../../../styles/touch";
import {ExerciseStepDto} from "../models/exerciseDetailsDto";
import "./exercise-step";

/** Steps of an exercise: a list on computers; on phones swiped one by one, the next one peeks in. */
@customElement("exercise-steps")
export class ExerciseSteps extends LitElement {

    static styles = [touchStyles, css`
        :host {
            display: block;
            min-width: 0;
        }

        ol {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-3);
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .pager {
            display: none;
        }

        @media (max-width: 768px) {
            ol.swipe {
                flex-direction: row;
                overflow-x: auto;
                overscroll-behavior-x: contain;
                scroll-snap-type: x mandatory;
                scroll-behavior: smooth;
                scrollbar-width: none;
                /* room for the shadow, which the scroll box would cut */
                padding-bottom: var(--app-space-2);
            }

            ol.swipe::-webkit-scrollbar {
                display: none;
            }

            .swipe li {
                display: flex;
                flex: 0 0 88%;
                min-width: 0;
                scroll-snap-align: start;
            }

            .swipe li:last-child {
                scroll-snap-align: end;
            }

            .swipe exercise-step {
                flex: 1;
                min-width: 0;
            }

            .pager {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: var(--app-space-2);
            }

            .dots {
                display: flex;
                gap: 6px;
            }

            .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--app-border);
            }

            .dot.current {
                background: var(--app-accent);
            }
        }

        @media (prefers-reduced-motion: reduce) {
            ol.swipe {
                scroll-behavior: auto;
            }
        }
    `];

    @property({attribute: false})
    steps: ExerciseStepDto[] = [];

    @state()
    private current = 0;

    @query("ol")
    private list!: HTMLElement;

    render() {
        const count = this.steps.length;
        const current = Math.min(this.current, count - 1);
        return html`
            <section aria-label="Steps">
                <ol class="${count > 1 ? "swipe" : ""}" tabindex="${count > 1 ? 0 : -1}" @scroll="${this.onScroll}">
                    ${repeat(this.steps, step => step.stepId, (step, i) => html`
                        <li><exercise-step .step="${step}" .number="${count > 1 ? i + 1 : 0}"></exercise-step></li>
                    `)}
                </ol>
                ${count > 1 ? html`
                    <div class="pager">
                        <sl-icon-button name="chevron-left" label="Previous step" ?disabled="${current === 0}"
                                        @click="${() => this.show(current - 1)}"></sl-icon-button>
                        <div class="dots" role="img" aria-label="Step ${current + 1} of ${count}">
                            ${this.steps.map((_, i) => html`<span class="dot ${i === current ? "current" : ""}"></span>`)}
                        </div>
                        <sl-icon-button name="chevron-right" label="Next step" ?disabled="${current === count - 1}"
                                        @click="${() => this.show(current + 1)}"></sl-icon-button>
                    </div>` : nothing}
            </section>
        `;
    }

    private offsets() {
        const items = [...this.list.children] as HTMLElement[];
        return items.map(item => item.offsetLeft - items[0].offsetLeft);
    }

    private onScroll = () => {
        this.current = nearestStep(this.offsets(), this.list.scrollLeft, this.list.scrollWidth - this.list.clientWidth);
    }

    private show(index: number) {
        this.list.scrollTo({left: this.offsets()[index]});
    }
}

/** Index of the step shown at this scroll position; at the end it is the last one, which cannot scroll further. */
export function nearestStep(offsets: number[], scrollLeft: number, maxScroll: number): number {
    if (maxScroll > 0 && scrollLeft >= maxScroll - 1) return offsets.length - 1;
    let nearest = 0;
    offsets.forEach((offset, i) => {
        if (Math.abs(offset - scrollLeft) < Math.abs(offsets[nearest] - scrollLeft)) nearest = i;
    });
    return nearest;
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-steps": ExerciseSteps;
    }
}
