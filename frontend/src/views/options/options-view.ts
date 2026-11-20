import {css, html} from 'lit';
import {touchStyles} from "../../styles/touch";
import {pageStyles} from "../../styles/page";
import {settingStyles} from "../../styles/settings";
import {toast} from "../../components/toast";
import "../../components/changelog-entries";
import {ChangelogEntry, loadChangelog, selectChangelog} from "../../shared-slices/changelog/changelogSlice";
import type {SlSelect, SlSwitch, SlTabGroup, SlTabShowEvent} from "@shoelace-style/shoelace";
import {ColorScheme, getColorScheme, setColorScheme} from "../../styles/color-scheme";
import "../../components/page-header";
import "./elements/reminder-settings";
import "./elements/account-settings";
import "./elements/delete-account";
import {customElement, property, query, state} from 'lit/decorators.js';
import {navigate} from "../../utils/navigation";
import {getTimerSound, isVibrationOn, setTimerSound, setVibrationOn} from "../../utils/preferences";
import {playTimerSound, TIMER_SOUNDS, TimerSound} from "../../utils/sounds";
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {selectPush} from "./slice/pushSlice";
import {clearInviteLinks, generateInviteLink, loadOptions, selectAutoCollapse, selectInviteLinks, selectInviteLinkStatus, setAutoCollapse} from "./slice/optionsSlice";

/** Tabs of the options page; each has its own URL (/options/<tab>, General: /options). */
export const OPTIONS_TABS = ["general", "reminders", "invite", "timer", "changelog"] as const;
export type OptionsTab = typeof OPTIONS_TABS[number];

const toTab = (value: string | undefined): OptionsTab =>
    OPTIONS_TABS.find(tab => tab === value) ?? "general";

@customElement('options-view')
export class OptionsView extends ConnectedLitElement {
    static styles = [pageStyles, touchStyles, settingStyles, css`

        .tab-content {
            padding: 1rem 0;
        }

        .invite-row {
            display: flex;
            align-items: flex-end;
            gap: 8px;
        }

        .invite-row sl-input {
            flex: 1;
        }

        .invite-hint {
            font-size: 0.8rem;
            color: var(--sl-color-neutral-500);
            margin-top: 0.5rem;
        }

        .invite-links-list {
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .invite-links-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.85rem;
            color: var(--sl-color-neutral-600);
            font-weight: 600;
        }

        .invite-link-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .invite-link-item sl-input {
            flex: 1;
        }

        .invite-error {
            margin-top: 0.5rem;
            font-size: 0.85rem;
            color: var(--sl-color-danger-600);
        }

        .general-form {
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .timer-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        /* own full-width line under the label: the sound names fit and the select is easy to tap */
        .sound-control {
            display: flex;
            gap: var(--app-space-2);
            align-items: center;
            margin-top: var(--app-space-2);
        }

        .sound-control sl-select {
            flex: 1;
        }

        .planned {
            display: flex;
            gap: var(--app-space-2);
            align-items: flex-start;
            font-size: 0.8rem;
            color: var(--app-text-muted);
        }

        .planned sl-icon {
            flex-shrink: 0;
            margin-top: 2px;
        }

    `];

    @state()
    private inviteLinks: string[] = [];

    @state()
    private inviteLinkStatus: string = "initial";

    /** Tab from the URL (/options/:tab); empty = General. */
    @property()
    tab = "";

    @query("sl-tab-group")
    private tabGroup?: SlTabGroup;

    @state()
    private autoCollapse: boolean = true;

    @state()
    private timerSound: TimerSound = getTimerSound();

    @state()
    private vibration = isVibrationOn();

    private readonly canShare = typeof navigator.share === "function";

    /** The Reminders tab is hidden when the server offers no push reminders. */
    @state()
    private remindersAvailable = true;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(loadOptions());
        store.dispatch(loadChangelog());
    }

    stateChanged(state: RootState) {
        this.inviteLinks = selectInviteLinks(state);
        this.inviteLinkStatus = selectInviteLinkStatus(state);
        this.autoCollapse = selectAutoCollapse(state);
        this.changelog = selectChangelog(state);
        const push = selectPush(state);
        this.remindersAvailable = push.status !== "error" && !(push.status === "idle" && !push.serverEnabled);
    }

    /** Device-local display preference, stored in localStorage (see styles/color-scheme.ts). */
    @state()
    private colorScheme: ColorScheme = getColorScheme();

    @state()
    private changelog: ChangelogEntry[] = [];

    private handleColorScheme = (e: Event) => {
        this.colorScheme = (e.target as SlSelect).value as ColorScheme;
        setColorScheme(this.colorScheme);
    }

    private async handleGenerateLink() {
        await store.dispatch(generateInviteLink());
    }

    private async handleCopyLink(link: string) {
        try {
            await navigator.clipboard.writeText(link);
            toast("Link copied", "success", 2000);
        } catch {
            toast("Could not copy – please copy the link manually", "warning");
        }
    }

    /** Back / forward between tabs: show the tab of the new URL (the first render uses `active`). */
    protected willUpdate(changed: Map<string, unknown>) {
        if (changed.has("tab") && this.hasUpdated) {
            void this.updateComplete.then(() => this.tabGroup?.show(toTab(this.tab)));
        }
    }

    /** A tab was chosen: give it its own URL, so it can be linked and Back returns to the previous tab. */
    private handleTabShow = (e: SlTabShowEvent) => {
        const name = toTab(e.detail.name);
        if (name !== toTab(this.tab)) {
            navigate(name === "general" ? "/options" : `/options/${name}`);
        }
    }

    private handleTimerSound = (e: Event) => {
        this.timerSound = (e.target as SlSelect).value as TimerSound;
        setTimerSound(this.timerSound);
        playTimerSound(this.timerSound);
    }

    private handleVibration = (e: Event) => {
        this.vibration = (e.target as SlSwitch).checked;
        setVibrationOn(this.vibration);
    }

    /** Phones: the system share sheet (WhatsApp, Signal, …); copying is the fallback. */
    private async handleShareLink(link: string) {
        try {
            await navigator.share({title: "Exercise Counter", text: "Join me on Exercise Counter:", url: link});
        } catch (error) {
            if ((error as DOMException)?.name !== "AbortError") { // AbortError = closed the share sheet
                await this.handleCopyLink(link);
            }
        }
    }

    private handleClearLinks() {
        store.dispatch(clearInviteLinks());
    }

    private renderTab(name: OptionsTab, label: string, hidden = false) {
        return html`<sl-tab slot="nav" panel="${name}" ?active="${name === toTab(this.tab)}"
                            ?hidden="${hidden}">${label}</sl-tab>`;
    }

    protected render() {
        return html`
            <div class="page-container">
                <page-header heading="Options"></page-header>

                <sl-tab-group placement="top" @sl-tab-show="${this.handleTabShow}">
                    <!-- Tabs -->
                    ${this.renderTab("general", "General")}
                    ${this.renderTab("reminders", "Reminders", !this.remindersAvailable)}
                    ${this.renderTab("invite", "Invite Link")}
                    ${this.renderTab("timer", "Timer")}
                    ${this.renderTab("changelog", "Changelog")}

                    <sl-tab-panel name="general">
                        <div class="tab-content">
                            <div class="general-form">
                                <div class="setting-row">
                                    <div>
                                        <div class="setting-label">Auto-collapse on check</div>
                                        <div class="setting-description">
                                            Collapse exercise cards automatically when marked as finished.
                                        </div>
                                    </div>
                                    <sl-switch
                                            ?checked="${this.autoCollapse}"
                                            @sl-change="${(e: Event) => store.dispatch(setAutoCollapse((e.target as SlSwitch).checked))}"
                                    ></sl-switch>
                                </div>
                                <div class="setting-row">
                                    <div>
                                        <div class="setting-label">Appearance</div>
                                        <div class="setting-description">
                                            Light or dark colors. "System" follows your device setting.
                                        </div>
                                    </div>
                                    <sl-select class="setting-control" size="small"
                                               .value="${this.colorScheme}"
                                               @sl-change="${this.handleColorScheme}">
                                        <sl-option value="system">System</sl-option>
                                        <sl-option value="light">Light</sl-option>
                                        <sl-option value="dark">Dark</sl-option>
                                    </sl-select>
                                </div>
                                <div class="setting-row">
                                    <div>
                                        <div class="setting-label">Vibration</div>
                                        <div class="setting-description">
                                            Short vibration when you mark an exercise as done or a timer ends (this device).
                                        </div>
                                    </div>
                                    <sl-switch ?checked="${this.vibration}" @sl-change="${this.handleVibration}"
                                               aria-label="Vibration"></sl-switch>
                                </div>
                                <account-settings></account-settings>
                                <delete-account></delete-account>
                            </div>
                        </div>
                    </sl-tab-panel>

                    <sl-tab-panel name="reminders">
                        <div class="tab-content">
                            <reminder-settings></reminder-settings>
                        </div>
                    </sl-tab-panel>

                    <sl-tab-panel name="invite">
                        <div class="tab-content">
                            <p>Generate a link to invite someone to join the app. Each link can only be used once.</p>
                            <sl-button
                                    variant="primary"
                                    ?loading="${this.inviteLinkStatus === 'loading'}"
                                    @click="${this.handleGenerateLink}"
                            >
                                Generate Link
                            </sl-button>
                            ${this.inviteLinkStatus === 'error' ? html`
                                <p class="invite-error">Failed to generate link. Please try again.</p>
                            ` : ''}
                            ${this.inviteLinks.length > 0 ? html`
                                <div class="invite-links-list">
                                    <div class="invite-links-header">
                                        <span>Generated links (${this.inviteLinks.length})</span>
                                        <sl-button size="small" variant="text" @click="${this.handleClearLinks}">
                                            Clear all
                                        </sl-button>
                                    </div>
                                    ${this.inviteLinks.map(link => html`
                                        <div class="invite-link-item">
                                            <sl-input readonly .value="${link}"></sl-input>
                                            ${this.canShare ? html`
                                                <sl-button variant="primary" aria-label="Share link"
                                                           @click="${() => this.handleShareLink(link)}">
                                                    <sl-icon name="share"></sl-icon>
                                                </sl-button>
                                            ` : ''}
                                            <sl-button variant="neutral" aria-label="Copy link"
                                                       @click="${() => this.handleCopyLink(link)}">
                                                <sl-icon name="clipboard"></sl-icon>
                                            </sl-button>
                                        </div>
                                    `)}
                                </div>
                            ` : ''}
                            <p class="invite-hint">Links are valid for a limited time and expire after one use.</p>
                        </div>
                    </sl-tab-panel>

                    <sl-tab-panel name="timer">
                        <div class="tab-content">
                            <div class="timer-form">
                                <div>
                                    <div class="setting-label">Sound when a timer ends</div>
                                    <div class="setting-description">Plays when you pick it. Saved on this device.</div>
                                    <div class="sound-control">
                                        <sl-select .value="${this.timerSound}" aria-label="Timer sound"
                                                   @sl-change="${this.handleTimerSound}">
                                            ${TIMER_SOUNDS.map(sound => html`
                                                <sl-option value="${sound.id}">${sound.label}</sl-option>`)}
                                        </sl-select>
                                        <sl-icon-button name="play-fill" label="Play sound"
                                                        ?disabled="${this.timerSound === "none"}"
                                                        @click="${() => playTimerSound(this.timerSound)}"></sl-icon-button>
                                    </div>
                                </div>
                                <div class="planned">
                                    <sl-icon name="music-note-beamed"></sl-icon>
                                    <span>Coming later: upload your own sound for the end of a timer.</span>
                                </div>
                            </div>
                        </div>
                    </sl-tab-panel>

                    <sl-tab-panel name="changelog">
                        <div class="tab-content">
                            <changelog-entries .entries="${this.changelog}"></changelog-entries>
                        </div>
                    </sl-tab-panel>
                </sl-tab-group>
            </div>
        `;
    }
}
