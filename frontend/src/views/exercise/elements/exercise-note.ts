import {css, html, LitElement, PropertyValues} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";
import type {SlTextarea} from "@shoelace-style/shoelace";

/** The user's own note on an exercise. Emits `save-note` (detail: the text, empty = delete); the parent saves. */
@customElement("exercise-note")
export class ExerciseNote extends LitElement {

    static styles = css`
        :host {
            display: block;
        }

        .head {
            display: flex;
            align-items: baseline;
            flex-wrap: wrap;
            gap: 0 var(--app-space-2);
            font-weight: 600;
        }

        .private {
            font-size: 0.85em;
            font-weight: 400;
            color: var(--app-text-muted);
        }

        /* the whole note is the button: one tap to edit */
        .note {
            display: block;
            width: 100%;
            min-height: 44px;
            margin-top: var(--app-space-1);
            padding: var(--app-space-3);
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius-sm);
            background: var(--app-surface);
            color: inherit;
            font: inherit;
            text-align: left;
            white-space: pre-line;
            overflow-wrap: anywhere;
            cursor: pointer;
        }

        sl-textarea {
            margin: var(--app-space-1) 0 var(--app-space-2);
        }

        .buttons {
            display: flex;
            justify-content: flex-end;
            gap: var(--app-space-2);
        }
    `;

    @property()
    text = "";

    @property({type: Boolean})
    saving = false;

    @state()
    private editing = false;

    @query("sl-textarea")
    private textarea?: SlTextarea;

    protected willUpdate(changed: PropertyValues<this>) {
        if (changed.has("text")) this.editing = false; // saved
    }

    render() {
        if (!this.editing && !this.text) {
            return html`
                <sl-button variant="text" size="small" @click="${this.edit}">
                    <sl-icon slot="prefix" name="pencil"></sl-icon>
                    Add note
                </sl-button>`;
        }
        return html`
            <div class="head">My notes <span class="private">Only you can see this</span></div>
            ${this.editing ? html`
                <sl-textarea rows="3" maxlength="1000" resize="auto" aria-label="My notes" .value="${this.text}"></sl-textarea>
                <div class="buttons">
                    <sl-button size="small" @click="${() => this.editing = false}">Cancel</sl-button>
                    <sl-button size="small" variant="primary" ?loading="${this.saving}" @click="${this.save}">Save</sl-button>
                </div>
            ` : html`
                <button class="note" title="Edit note" @click="${this.edit}">${this.text}</button>
            `}
        `;
    }

    private edit = async () => {
        this.editing = true;
        await this.updateComplete;
        await this.textarea?.updateComplete;
        this.textarea?.focus();
    }

    private save = () => {
        const text = (this.textarea?.value ?? "").trim();
        if (text === this.text) {
            this.editing = false;
            return;
        }
        this.dispatchEvent(new CustomEvent<string>("save-note", {detail: text}));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-note": ExerciseNote;
    }
}
