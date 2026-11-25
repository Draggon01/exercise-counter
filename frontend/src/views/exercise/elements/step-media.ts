import {css, html, LitElement, PropertyValues} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";
import {keyed} from "lit/directives/keyed.js";
import {MediaDto} from "../models/exerciseDetailsDto";
import "../../../components/loop-video";

/** Video or photo of a step. */
@customElement("step-media")
export class StepMedia extends LitElement {

    static styles = css`
        :host {
            display: block;
        }

        loop-video, .photo, .message {
            width: 100%;
            aspect-ratio: var(--ratio, 1);
            max-height: 50vh;
            margin: 0 auto;
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

    /** A video plays at once, and goes on with the next one when `media` changes. */
    @property({type: Boolean})
    autoplay = false;

    @state()
    private failed = false;

    protected willUpdate(changed: PropertyValues<this>) {
        if (!changed.has("media")) return;
        this.failed = false;
        const {width, height} = this.media;
        // the shape of the picture, but neither a tower nor a stripe
        this.style.setProperty("--ratio", String(width && height ? Math.min(4 / 3, Math.max(3 / 4, width / height)) : 1));
    }

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
            // autoplay: the same element for all videos – phones allow sound only where the user turned it on
            return keyed(this.autoplay || mediaId, html`
                <loop-video src="${url}" poster="${url}/poster" .label="${this.label}" ?hasSound="${hasAudio}"
                            ?autoplay="${this.autoplay}"></loop-video>`);
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
