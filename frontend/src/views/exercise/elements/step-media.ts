import {css, html, LitElement} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";
import {keyed} from "lit/directives/keyed.js";
import {MediaDto} from "../models/exerciseDetailsDto";
import "../../../components/loop-video";

/** Video or photo of a step, in a square. */
@customElement("step-media")
export class StepMedia extends LitElement {

    static styles = css`
        :host {
            display: block;
        }

        loop-video, .photo, .message {
            width: 100%;
            aspect-ratio: 1;
            max-height: 50vh;
        }

        .photo {
            display: block;
            padding: 0;
            border: none;
            border-radius: var(--app-radius-sm);
            overflow: hidden;
            background: var(--app-surface-muted);
            cursor: zoom-in;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .message {
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--app-space-2);
            padding: var(--app-space-3);
            border-radius: var(--app-radius-sm);
            background: var(--app-surface-muted);
            color: var(--app-text-muted);
            text-align: center;
        }

        dialog {
            width: 100vw;
            height: 100dvh;
            max-width: none;
            max-height: none;
            margin: 0;
            padding: 0;
            border: none;
            background: #000;
            cursor: zoom-out;
        }
    `;

    @property({attribute: false})
    media!: MediaDto;

    /** Title of the step. */
    @property()
    label = "";

    @state()
    private failed = false;

    @query("dialog")
    private dialog?: HTMLDialogElement;

    render() {
        const {mediaId, kind, status, hasAudio, error} = this.media;
        const url = `/api/media/${mediaId}`;
        if (status === "PROCESSING") {
            return html`<div class="message"><sl-spinner></sl-spinner>${kind === "VIDEO" ? "Video" : "Photo"} is being prepared…</div>`;
        }
        if (status === "FAILED") {
            return html`<div class="message">${error}</div>`;
        }
        if (kind === "VIDEO") {
            return keyed(mediaId, html`<loop-video src="${url}" poster="${url}/poster" .label="${this.label}" ?hasSound="${hasAudio}"></loop-video>`);
        }
        if (this.failed) {
            return html`
                <div class="message">
                    The photo could not be loaded.
                    <sl-button size="small" @click="${() => this.failed = false}">Try again</sl-button>
                </div>`;
        }
        return html`
            <button class="photo" aria-label="Enlarge photo: ${this.label}" @click="${() => this.dialog?.showModal()}">
                <img src="${url}" alt="${this.label}" loading="lazy" @error="${() => this.failed = true}">
            </button>
            <dialog aria-label="${this.label}" @click="${() => this.dialog?.close()}"><img src="${url}" alt="${this.label}" loading="lazy"></dialog>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "step-media": StepMedia;
    }
}
