import {css, html, LitElement, nothing} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";
import {touchStyles} from "../styles/touch";

/** Sound choice, kept while the app is open. */
let soundOn = false;

/** The one that plays. */
let playing: LoopVideo | undefined;

/**
 * Short clip that plays in a loop after a tap (never by itself: mobile data). Only one plays at a time; it stops when
 * scrolled away, hidden or removed. Sound (if it has some) starts off.
 */
@customElement("loop-video")
export class LoopVideo extends LitElement {

    static styles = [touchStyles, css`
        :host {
            display: block;
        }

        .box {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            border-radius: var(--app-radius-sm);
            background: var(--app-surface-muted);
        }

        .box:fullscreen {
            border-radius: 0;
            background: #000;
        }

        video {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
            cursor: pointer;
        }

        .play {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: none;
            cursor: pointer;
        }

        .play span {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgb(0 0 0 / 55%);
            color: #fff;
            font-size: 2rem;
        }

        .tools {
            position: absolute;
            right: var(--app-space-1);
            bottom: var(--app-space-1);
            display: flex;
            border-radius: var(--app-radius-sm);
            background: rgb(0 0 0 / 55%);
        }

        .tools sl-icon-button::part(base), .speed {
            color: #fff;
        }

        .speed {
            min-width: 44px;
            min-height: 36px;
            border: none;
            background: none;
            font: inherit;
            font-size: 0.85em;
            font-weight: 600;
            cursor: pointer;
        }

        .failed {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--app-space-2);
            padding: var(--app-space-3);
            background: var(--app-surface-muted);
            color: var(--app-text-muted);
            text-align: center;
        }
    `];

    @property()
    src = "";

    @property()
    poster = "";

    /** What is shown, for screen readers. */
    @property()
    label = "";

    @property({type: Boolean})
    hasSound = false;

    @state()
    private isPlaying = false;

    @state()
    private slow = false;

    @state()
    private failed = false;

    @query("video")
    private video!: HTMLVideoElement;

    @query(".box")
    private box!: HTMLElement;

    private observer?: IntersectionObserver;

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener("visibilitychange", this.onVisibilityChange);
        if (typeof IntersectionObserver !== "undefined") {
            this.observer = new IntersectionObserver(entries => {
                if (!entries.at(-1)!.isIntersecting && !document.fullscreenElement) this.pause();
            }, {threshold: 0.2});
            this.observer.observe(this);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
        this.observer?.disconnect();
        this.pause();
    }

    render() {
        return html`
            <div class="box">
                <video src="${this.src}" poster="${this.poster}" loop playsinline preload="none" .muted="${!soundOn || !this.hasSound}"
                       aria-label="${this.label}" @click="${this.toggle}" @play="${() => this.isPlaying = true}"
                       @pause="${() => this.isPlaying = false}" @error="${this.onError}"></video>
                ${this.failed ? html`
                    <div class="failed">
                        The video could not be loaded.
                        <sl-button size="small" @click="${this.retry}">Try again</sl-button>
                    </div>` : html`
                    ${this.isPlaying ? nothing : html`
                        <button class="play" aria-label="Play ${this.label}" @click="${this.toggle}">
                            <span><sl-icon name="play-fill"></sl-icon></span>
                        </button>`}
                    <div class="tools">
                        ${this.hasSound ? html`
                            <sl-icon-button name="${soundOn ? "volume-up-fill" : "volume-mute-fill"}"
                                            label="${soundOn ? "Sound off" : "Sound on"}" @click="${this.toggleSound}"></sl-icon-button>` : nothing}
                        <button class="speed" aria-label="Speed ${this.slow ? "half" : "normal"}" @click="${this.toggleSpeed}">
                            ${this.slow ? "0.5×" : "1×"}
                        </button>
                        <sl-icon-button name="arrows-fullscreen" label="Large view" @click="${this.enlarge}"></sl-icon-button>
                    </div>`}
            </div>
        `;
    }

    private toggle = () => {
        if (this.isPlaying) this.pause();
        else void this.play();
    }

    private async play() {
        if (playing !== this) playing?.pause();
        playing = this;
        this.requestUpdate(); // the sound may have been switched at another one
        try {
            await this.video.play();
        } catch (e) {
            // paused again before it started is fine
            if ((e as DOMException).name !== "AbortError") this.failed = true;
        }
    }

    private pause() {
        if (playing === this) playing = undefined;
        this.video?.pause();
    }

    private toggleSound = () => {
        soundOn = !soundOn;
        this.requestUpdate();
    }

    private toggleSpeed = () => {
        this.slow = !this.slow;
        this.video.defaultPlaybackRate = this.video.playbackRate = this.slow ? 0.5 : 1;
    }

    private enlarge = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else if (this.box.requestFullscreen) {
            void this.box.requestFullscreen().catch(() => undefined);
        } else {
            // iPhone: only videos can be full screen
            (this.video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
        }
        void this.play();
    }

    private onError = () => {
        this.failed = true;
        this.isPlaying = false;
    }

    private retry = () => {
        this.failed = false;
        this.video.load();
        void this.play();
    }

    private onVisibilityChange = () => {
        if (document.visibilityState === "hidden") this.pause();
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "loop-video": LoopVideo;
    }
}
