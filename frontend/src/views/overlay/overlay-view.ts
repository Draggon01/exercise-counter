import {customElement, state} from 'lit/decorators.js';
import {css, html} from 'lit';
import {RootState, store} from "../../store";
import {logoutUser, selectCurrentUser} from "../login/slice/userSlice";
import {ConnectedLitElement} from "../../connectedLitElement";
import {UserDto} from "../login/models/userDto";
import {navigate} from "../../utils/navigation";
import {ChangelogEntry, markChangelogSeen, selectUnseenChangelog} from "../../shared-slices/changelog/changelogSlice";
import "../../components/changelog-dialog";
import {styleMap} from "lit/directives/style-map.js";
import {pullDistance, PULL_THRESHOLD, requestAppRefresh} from "../../utils/refresh";

type NavItem = { path: string, label: string, icon: string };

/** Main sections, shown in the header (desktop) and the bottom bar (mobile). */
const NAV_ITEMS: NavItem[] = [
    {path: "/", label: "Home", icon: "house"},
    {path: "/browse", label: "Browse", icon: "search"},
    {path: "/groups", label: "Groups", icon: "people"},
    {path: "/options", label: "Options", icon: "gear"},
];

/**
 * App shell for logged-in pages: header with brand, navigation and user menu; the page in the
 * `main` slot; a bottom navigation bar on mobile.
 */
@customElement('overlay-view')
export class OverlayView extends ConnectedLitElement {
    static styles = css`
        :host {
            display: grid;
            /* the header grows by the notch / status bar inset (viewport-fit=cover) */
            grid-template-rows: calc(var(--app-header-height) + env(safe-area-inset-top)) 1fr auto;
            height: 100vh;
            height: 100dvh;
        }

        header {
            display: flex;
            align-items: center;
            gap: var(--app-space-4);
            padding: env(safe-area-inset-top) max(var(--app-space-4), env(safe-area-inset-right)) 0 max(var(--app-space-4), env(safe-area-inset-left));
            background: var(--app-surface);
            border-bottom: 1px solid var(--app-border);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: var(--app-space-2);
            font-weight: 700;
            font-size: 1.1rem;
            color: var(--app-text);
            text-decoration: none;
            white-space: nowrap;
            min-height: 44px;
        }

        .brand sl-icon {
            font-size: 1.4rem;
            color: var(--app-accent);
        }

        .top-nav {
            display: flex;
            gap: var(--app-space-1);
            margin-left: var(--app-space-4);
        }

        .top-nav a {
            display: flex;
            align-items: center;
            gap: var(--app-space-2);
            padding: var(--app-space-2) var(--app-space-3);
            border-radius: var(--app-radius-sm);
            color: var(--app-text-muted);
            text-decoration: none;
            font-weight: 500;
        }

        .top-nav a:hover {
            background: var(--app-surface-muted);
            color: var(--app-text);
        }

        .top-nav a.active {
            background: var(--app-accent-soft);
            color: var(--app-accent);
        }

        .user-menu {
            margin-left: auto;
        }

        .user-trigger {
            display: flex;
            align-items: center;
            gap: var(--app-space-2);
            padding: var(--app-space-1) var(--app-space-2);
            border: none;
            min-height: 44px;
            border-radius: var(--app-radius-pill);
            background: none;
            color: var(--app-text);
            font: inherit;
            cursor: pointer;
        }

        .user-trigger:hover {
            background: var(--app-surface-muted);
        }

        sl-avatar {
            --size: 2rem;
        }

        main {
            overflow: auto;
            min-height: 0;
            /* no scroll chaining / browser refresh – pulling down at the top is our pull to refresh */
            overscroll-behavior-y: contain;
        }

        /* ---- pull to refresh: a round indicator drops in from the top of the page */
        .pull {
            position: sticky;
            top: 0;
            z-index: 20;
            height: 0;
            display: flex;
            justify-content: center;
            pointer-events: none;
        }

        .pull-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--app-surface);
            color: var(--app-accent);
            box-shadow: var(--app-shadow-raised);
            font-size: 1.25rem;
            transform: translateY(calc(var(--pull, 0px) - 44px));
            opacity: var(--pull-opacity, 0);
        }

        .pull.released .pull-indicator {
            transition: transform 0.2s ease, opacity 0.2s ease;
        }

        /* turns while pulling; full color once releasing refreshes */
        .pull-indicator sl-icon {
            transform: rotate(calc(var(--pull, 0px) / 1px * 4deg));
            opacity: 0.6;
        }

        .pull.ready .pull-indicator sl-icon {
            opacity: 1;
        }

        .bottom-nav {
            display: none;
        }

        @media (max-width: 768px) {
            .top-nav, .username {
                display: none;
            }

            .bottom-nav {
                display: grid;
                grid-template-columns: repeat(4, 1fr); /* NAV_ITEMS.length */
                min-height: var(--app-bottom-nav-height);
                box-sizing: content-box;
                background: var(--app-surface);
                border-top: 1px solid var(--app-border);
                padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            }

            .bottom-nav a {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                padding: var(--app-space-2) 0;
                color: var(--app-text-subtle);
                text-decoration: none;
                font-size: 0.75rem;
            }

            .bottom-nav a sl-icon {
                font-size: 1.3rem;
            }

            .bottom-nav a.active {
                color: var(--app-accent);
            }
        }
    `;

    @state()
    private user?: UserDto;

    /** Changelog entries the user has not seen yet ("what's new" dialog). */
    @state()
    private unseenChangelog: ChangelogEntry[] = [];

    /** Current path, to highlight the active section. */
    @state()
    private path = window.location.pathname;

    // ---- pull to refresh

    /** How far the indicator is pulled down (px); 0 = hidden. */
    @state()
    private pull = 0;

    @state()
    private refreshing = false;

    private pullStartY?: number;

    private renderPull() {
        const shown = this.refreshing ? PULL_THRESHOLD : this.pull;
        const classes = [this.pullStartY === undefined ? "released" : "", this.pull >= PULL_THRESHOLD ? "ready" : ""];
        return html`
            <div class="pull ${classes.join(" ")}" aria-hidden="${!this.refreshing}"
                 style="${styleMap({"--pull": `${shown}px`, "--pull-opacity": `${Math.min(1, shown / PULL_THRESHOLD)}`})}">
                <div class="pull-indicator" role="status" aria-label="${this.refreshing ? "Refreshing" : ""}">
                    ${this.refreshing ? html`<sl-spinner></sl-spinner>` : html`<sl-icon name="arrow-clockwise"></sl-icon>`}
                </div>
            </div>`;
    }

    private pullStart = (e: TouchEvent) => {
        const main = e.currentTarget as HTMLElement;
        // not while scrolled down, refreshing, inside dialogs / the timer view or while sorting cards
        const path = e.composedPath() as HTMLElement[];
        const ignored = path.some(el => el.getAttribute?.("role") === "dialog" || el.dataset?.dragHandle !== undefined);
        if (main.scrollTop > 0 || this.refreshing || ignored || e.touches.length !== 1) return;
        this.pullStartY = e.touches[0].clientY;
    }

    private pullMove = (e: TouchEvent) => {
        if (this.pullStartY === undefined) return;
        const main = e.currentTarget as HTMLElement;
        if (main.scrollTop > 0) {
            this.pullStartY = undefined;
            this.pull = 0;
            return;
        }
        const next = pullDistance(e.touches[0].clientY - this.pullStartY);
        if (this.pull < PULL_THRESHOLD && next >= PULL_THRESHOLD) navigator.vibrate?.(10);
        this.pull = next;
    }

    private pullEnd = async () => {
        if (this.pullStartY === undefined) return;
        const ready = this.pull >= PULL_THRESHOLD;
        this.pullStartY = undefined;
        this.pull = 0;
        if (!ready) return;
        this.refreshing = true;
        // at least a short moment, so the spinner does not just flash
        await Promise.all([requestAppRefresh(), new Promise(resolve => setTimeout(resolve, 500))]);
        this.refreshing = false;
    }

    private onLocationChange = () => {
        this.path = window.location.pathname;
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("popstate", this.onLocationChange);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("popstate", this.onLocationChange);
    }

    stateChanged(state: RootState) {
        this.user = selectCurrentUser(state);
        this.unseenChangelog = selectUnseenChangelog(state);
    }

    private async handleLogout() {
        await store.dispatch(logoutUser());
        navigate("/login");
    }

    /** Navigates inside the app instead of reloading (keeps modifier-clicks working). */
    private go(e: MouseEvent, path: string) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(path);
    }

    private renderLinks(items: NavItem[]) {
        return items.map(item => html`
            <a href="${item.path}"
               class="${this.path === item.path ? "active" : ""}"
               aria-current="${this.path === item.path ? "page" : "false"}"
               @click="${(e: MouseEvent) => this.go(e, item.path)}">
                <sl-icon name="${item.icon}"></sl-icon>
                <span>${item.label}</span>
            </a>
        `);
    }

    protected render() {
        const username = this.user?.username ?? "";
        return html`
            <header>
                <a class="brand" href="/" @click="${(e: MouseEvent) => this.go(e, "/")}">
                    <sl-icon name="lightning-charge-fill"></sl-icon>
                    Exercise Counter
                </a>
                <nav class="top-nav" aria-label="Main">${this.renderLinks(NAV_ITEMS)}</nav>
                <sl-dropdown class="user-menu" placement="bottom-end">
                    <button slot="trigger" class="user-trigger" aria-label="User menu">
                        <sl-avatar initials="${username.slice(0, 2).toUpperCase()}" label="${username}"></sl-avatar>
                        <span class="username">${username}</span>
                        <sl-icon name="chevron-down"></sl-icon>
                    </button>
                    <sl-menu>
                        <sl-menu-item @click="${this.handleLogout}">
                            <sl-icon slot="prefix" name="box-arrow-right"></sl-icon>
                            Logout
                        </sl-menu-item>
                    </sl-menu>
                </sl-dropdown>
            </header>
            <main @touchstart="${this.pullStart}" @touchmove="${this.pullMove}" @touchend="${this.pullEnd}"
                  @touchcancel="${this.pullEnd}">
                ${this.renderPull()}
                <slot name="main"></slot>
            </main>
            <nav class="bottom-nav" aria-label="Main">${this.renderLinks(NAV_ITEMS)}</nav>
            <changelog-dialog .open="${this.unseenChangelog.length > 0}" .entries="${this.unseenChangelog}"
                              @close="${() => store.dispatch(markChangelogSeen())}"></changelog-dialog>
        `;
    }
}
