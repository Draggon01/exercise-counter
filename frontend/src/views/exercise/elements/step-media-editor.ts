import {css, html, LitElement, nothing} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";
import {store} from "../../../store";
import {touchStyles} from "../../../styles/touch";
import {mediaProblem, videoSeconds} from "../../../utils/media-file";
import {ExerciseStepDto, MediaConfigDto} from "../models/exerciseDetailsDto";
import {cancelUpload, deleteMedia, loadMediaUsage, MediaUpload, uploadDismissed, uploadMedia} from "../slice/mediaSlice";
import "../../../components/confirm-dialog";
import "./step-media";

/** Video or photo of a step in the editor: add, replace, remove, with the progress of an upload. */
@customElement("step-media-editor")
export class StepMediaEditor extends LitElement {

    /* the parts lie directly in the parent's row: picture first, messages on their own line */
    static styles = [touchStyles, css`
        :host {
            display: contents;
        }

        .tile {
            order: -1;
            flex: 0 0 60px;
            height: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            padding: 0;
            overflow: hidden;
            border: 1px dashed var(--app-text-subtle);
            border-radius: var(--app-radius-sm);
            background: var(--app-surface-muted);
            color: var(--app-accent);
            font: inherit;
            font-size: 0.75em;
            cursor: pointer;
        }

        .tile.filled {
            border: none;
            position: relative;
        }

        .tile sl-icon {
            font-size: 1.3rem;
        }

        .tile img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .tile.filled sl-icon {
            position: absolute;
            color: #fff;
            filter: drop-shadow(0 0 3px rgb(0 0 0 / 80%));
        }

        .row {
            order: 9;
            flex: 1 0 100%;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-2);
            padding-top: var(--app-space-1);
            font-size: 0.9em;
            color: var(--app-text-muted);
        }

        .text {
            flex: 1;
            min-width: 120px;
        }

        .error {
            color: var(--app-danger);
        }

        sl-progress-bar {
            flex: 1;
            min-width: 100px;
            --height: 8px;
        }

        input {
            display: none;
        }
    `];

    @property()
    exerciseId = "";

    @property({attribute: false})
    step!: ExerciseStepDto;

    @property({attribute: false})
    config?: MediaConfigDto;

    /** The running or failed upload of this step. */
    @property({attribute: false})
    upload?: MediaUpload;

    /** The chosen file cannot be used. */
    @state()
    private problem = "";

    @state()
    private preview = false;

    @state()
    private confirmDelete = false;

    @query("input")
    private input!: HTMLInputElement;

    /** To try again. */
    private file?: File;

    render() {
        const media = this.step.media;
        return html`
            ${this.renderTile()}
            ${this.renderMessage()}
            <input type="file" accept="video/*,image/jpeg,image/png,image/webp" @change="${this.chosen}">
            <sl-dialog label="${this.step.title}" .open="${this.preview}" @sl-request-close="${this.closePreview}">
                ${this.preview && media ? html`<step-media .media="${media}" .label="${this.step.title}"></step-media>` : nothing}
                <sl-button slot="footer" variant="text" @click="${() => this.confirmDelete = true}">Remove</sl-button>
                ${this.config?.enabled ? html`
                    <sl-button slot="footer" @click="${this.choose}">Replace</sl-button>` : nothing}
                <sl-button slot="footer" variant="primary" @click="${this.closePreview}">Close</sl-button>
            </sl-dialog>
            <confirm-dialog label="Remove ${this.kind}" confirmLabel="Remove" .open="${this.confirmDelete}"
                            @confirm="${this.removeMedia}" @cancel="${() => this.confirmDelete = false}">
                Remove the ${this.kind} of “${this.step.title}”?
            </confirm-dialog>
        `;
    }

    private get kind() {
        return this.step.media?.kind === "PHOTO" ? "photo" : "video";
    }

    private get uploading() {
        return this.upload !== undefined && !this.upload.error;
    }

    private renderTile() {
        const media = this.step.media;
        if (this.uploading || media?.status === "PROCESSING") {
            return html`<div class="tile filled"><sl-spinner></sl-spinner></div>`;
        }
        if (media?.status === "READY") {
            return html`
                <button class="tile filled" title="Show, replace or remove" aria-label="${this.kind} of ${this.step.title}"
                        @click="${() => this.preview = true}">
                    <img src="/api/media/${media.mediaId}${media.kind === "VIDEO" ? "/poster" : ""}" alt="">
                    ${media.kind === "VIDEO" ? html`<sl-icon name="play-fill"></sl-icon>` : nothing}
                </button>`;
        }
        return this.config?.enabled ? html`
            <button class="tile" title="Add a video or photo" aria-label="Add a video or photo to ${this.step.title}" @click="${this.choose}">
                <sl-icon name="camera-video"></sl-icon>
                Add
            </button>` : nothing;
    }

    private renderMessage() {
        const media = this.step.media;
        if (this.upload && this.uploading) {
            const progress = this.upload.progress;
            return html`
                <div class="row">
                    <span>${progress < 1 ? "Uploading…" : "Almost done…"}</span>
                    <sl-progress-bar value="${Math.round(progress * 100)}" label="Upload"></sl-progress-bar>
                    ${progress < 1 ? html`
                        <sl-button size="small" @click="${() => cancelUpload(this.step.stepId)}">Cancel</sl-button>` : nothing}
                </div>`;
        }
        if (media?.status === "PROCESSING") {
            return html`
                <div class="row">
                    <span class="text">The ${this.kind} is being prepared – you can go on.</span>
                    <sl-button size="small" variant="text" @click="${() => this.confirmDelete = true}">Remove</sl-button>
                </div>`;
        }
        const error = this.problem || this.upload?.error || (media?.status === "FAILED" ? media.error : "");
        if (!error) return nothing;
        return html`
            <div class="row">
                <span class="text error" role="alert">${error}</span>
                ${this.upload?.error && !this.problem && this.file ? html`
                    <sl-button size="small" @click="${() => this.start(this.file!)}">Try again</sl-button>` : nothing}
                ${media?.status === "FAILED" ? html`
                    <sl-button size="small" variant="text" @click="${() => this.confirmDelete = true}">Remove</sl-button>` : nothing}
            </div>`;
    }

    private choose = () => this.input.click();

    private closePreview = (e: Event) => {
        if (e.type === "sl-request-close" && e.target !== e.currentTarget) return;
        this.preview = false;
    }

    private chosen = async () => {
        const file = this.input.files?.[0];
        this.input.value = ""; // the same file can be chosen again
        if (!file || !this.config) return;
        this.problem = mediaProblem(file, await videoSeconds(file), this.config) ?? "";
        if (this.problem) {
            this.preview = false;
            store.dispatch(uploadDismissed(this.step.stepId));
            return;
        }
        this.preview = false;
        this.start(file);
    }

    private start(file: File) {
        this.file = file;
        void store.dispatch(uploadMedia({exerciseId: this.exerciseId, stepId: this.step.stepId, file}));
    }

    private removeMedia = async () => {
        this.confirmDelete = false;
        this.preview = false;
        this.problem = "";
        await store.dispatch(deleteMedia({exerciseId: this.exerciseId, stepId: this.step.stepId}));
        store.dispatch(loadMediaUsage());
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "step-media-editor": StepMediaEditor;
    }
}
