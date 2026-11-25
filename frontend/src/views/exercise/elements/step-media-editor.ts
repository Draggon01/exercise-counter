import {css, html, LitElement, nothing} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";
import {store} from "../../../store";
import {touchStyles} from "../../../styles/touch";
import {mediaProblem, videoSeconds} from "../../../utils/media-file";
import {ExerciseStepDto, MediaConfigDto} from "../models/exerciseDetailsDto";
import {cancelUpload, deleteMedia, loadMediaUsage, MediaUpload, uploadDismissed, uploadMedia} from "../slice/mediaSlice";
import "../../../components/confirm-dialog";

/** Video or photo of a step in the editor: add, replace, remove, with the progress of an upload. */
@customElement("step-media-editor")
export class StepMediaEditor extends LitElement {

    static styles = [touchStyles, css`
        .row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-2);
            padding-top: var(--app-space-1);
        }

        .thumb {
            width: 56px;
            height: 56px;
            object-fit: cover;
            border-radius: var(--app-radius-sm);
            background: var(--app-surface-muted);
        }

        .text {
            flex: 1;
            min-width: 120px;
            font-size: 0.9em;
            color: var(--app-text-muted);
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
    private confirmDelete = false;

    @query("input")
    private input!: HTMLInputElement;

    /** To try again. */
    private file?: File;

    render() {
        return html`
            <div class="row">${this.upload && !this.upload.error ? this.renderUploading(this.upload) : this.renderMedia()}</div>
            <input type="file" accept="video/*,image/jpeg,image/png,image/webp" @change="${this.chosen}">
            <confirm-dialog label="Remove ${this.kind}" confirmLabel="Remove" .open="${this.confirmDelete}"
                            @confirm="${this.removeMedia}" @cancel="${() => this.confirmDelete = false}">
                Remove the ${this.kind} of “${this.step.title}”?
            </confirm-dialog>
        `;
    }

    private get kind() {
        return this.step.media?.kind === "PHOTO" ? "photo" : "video";
    }

    private renderUploading(upload: MediaUpload) {
        return html`
            <span class="text">${upload.progress < 1 ? "Uploading…" : "Almost done…"}</span>
            <sl-progress-bar value="${Math.round(upload.progress * 100)}" label="Upload"></sl-progress-bar>
            ${upload.progress < 1 ? html`
                <sl-button size="small" @click="${() => cancelUpload(this.step.stepId)}">Cancel</sl-button>` : nothing}`;
    }

    private renderMedia() {
        const media = this.step.media;
        const error = this.problem || this.upload?.error || (media?.status === "FAILED" ? media.error : "");
        const canUpload = this.config?.enabled;
        return html`
            ${media?.status === "READY" ? html`
                <img class="thumb" src="/api/media/${media.mediaId}${media.kind === "VIDEO" ? "/poster" : ""}" alt="">` : nothing}
            ${media?.status === "PROCESSING" ? html`
                <sl-spinner></sl-spinner><span class="text">The ${this.kind} is being prepared – you can go on.</span>` : nothing}
            ${error ? html`<span class="text error" role="alert">${error}</span>` : nothing}
            ${canUpload && this.upload?.error && !this.problem && this.file ? html`
                <sl-button size="small" @click="${() => this.start(this.file!)}">Try again</sl-button>` : nothing}
            ${canUpload && media?.status !== "PROCESSING" ? html`
                <sl-button size="small" @click="${() => this.input.click()}">
                    <sl-icon slot="prefix" name="camera-video"></sl-icon>
                    ${media || error ? media?.status === "READY" ? "Replace" : "Choose another" : "Add video or photo"}
                </sl-button>` : nothing}
            ${media ? html`
                <sl-button size="small" variant="text" @click="${() => this.confirmDelete = true}">Remove</sl-button>` : nothing}
        `;
    }

    private chosen = async () => {
        const file = this.input.files?.[0];
        this.input.value = ""; // the same file can be chosen again
        if (!file || !this.config) return;
        this.problem = mediaProblem(file, await videoSeconds(file), this.config) ?? "";
        if (this.problem) {
            store.dispatch(uploadDismissed(this.step.stepId));
            return;
        }
        this.start(file);
    }

    private start(file: File) {
        this.file = file;
        void store.dispatch(uploadMedia({exerciseId: this.exerciseId, stepId: this.step.stepId, file}));
    }

    private removeMedia = async () => {
        this.confirmDelete = false;
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
