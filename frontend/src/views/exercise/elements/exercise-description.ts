import {css, html, LitElement, nothing, PropertyValues} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";

/** Description of an exercise: the first lines, the rest with "Show more". */
@customElement("exercise-description")
export class ExerciseDescription extends LitElement {

    static styles = css`
        :host {
            display: block;
        }

        .text {
            margin: 0;
            white-space: pre-line;
            overflow-wrap: anywhere;
        }

        .text.clamped {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 3;
            line-clamp: 3;
            overflow: hidden;
        }

        sl-button::part(label) {
            padding: 0;
        }
    `;

    @property()
    text = "";

    @state()
    private expanded = false;

    /** The text is longer than what is shown. */
    @state()
    private overflows = false;

    @query(".text")
    private textElement?: HTMLElement;

    private resize?: ResizeObserver;

    connectedCallback() {
        super.connectedCallback();
        this.resize = new ResizeObserver(() => this.measure());
        this.resize.observe(this);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.resize?.disconnect();
    }

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has("text")) {
            this.expanded = false;
            void this.updateComplete.then(() => this.measure());
        }
    }

    render() {
        return html`
            <p class="text ${this.expanded ? "" : "clamped"}">${this.text}</p>
            ${this.overflows || this.expanded ? html`
                <sl-button variant="text" size="small" aria-expanded="${this.expanded}"
                           @click="${() => this.expanded = !this.expanded}">
                    ${this.expanded ? "Show less" : "Show more"}
                </sl-button>` : nothing}
        `;
    }

    private measure() {
        const text = this.textElement;
        if (text && !this.expanded) this.overflows = text.scrollHeight > text.clientHeight + 1;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-description": ExerciseDescription;
    }
}
