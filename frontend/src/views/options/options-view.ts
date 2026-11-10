import {css, html} from 'lit';
import {touchStyles} from "../../styles/touch";
import {pageStyles} from "../../styles/page";
import {settingStyles} from "../../styles/settings";
import {toast} from "../../components/toast";
import "../../components/changelog-entries";
import {ChangelogEntry, loadChangelog, selectChangelog} from "../../shared-slices/changelog/changelogSlice";
import type {SlSelect, SlSwitch} from "@shoelace-style/shoelace";
import {ColorScheme, getColorScheme, setColorScheme} from "../../styles/color-scheme";
import "../../components/page-header";
import "./elements/reminder-settings";
import {customElement, state} from 'lit/decorators.js';
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {clearInviteLinks, clearUnfinishedPeriods, generateInviteLink, loadOptions, loadUnfinishedPeriods, PeriodDto, selectAutoCollapse, selectInviteLinks, selectInviteLinkStatus, selectMissedEntryStatus, selectUnfinishedPeriods, selectUnfinishedPeriodsStatus, setAutoCollapse, submitMissedEntry} from "./slice/optionsSlice";
import {listExercises, selectVisibleExercises} from "../home/slice/exerciseSlice";
import {ExerciseDto} from "../home/models/exerciseDto";

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

        .wip-notice {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0.75rem;
            background: var(--sl-color-warning-50);
            border: 1px solid var(--sl-color-warning-200);
            border-radius: 6px;
            color: var(--sl-color-warning-800);
            font-size: 0.875rem;
        }

        .wip-description {
            margin-top: 1rem;
            color: var(--sl-color-neutral-500);
            font-size: 0.875rem;
        }

        .missed-entry-form {
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .missed-entry-form sl-select {
            width: 100%;
        }

        .missed-entry-error {
            font-size: 0.85rem;
            color: var(--sl-color-danger-600);
        }

        .general-form {
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }


        .timer-sound-form {
            margin-top: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            opacity: 0.5;
            pointer-events: none;
        }

        .timer-sound-form sl-select {
            width: 100%;
        }






    `];

    @state()
    private inviteLinks: string[] = [];

    @state()
    private inviteLinkStatus: string = "initial";

    @state()
    private exercises: ExerciseDto[] = [];

    @state()
    private autoCollapse: boolean = true;

    @state()
    private selectedExerciseId: string = "";

    @state()
    private selectedPeriodId: string = "";

    @state()
    private unfinishedPeriods: PeriodDto[] = [];

    @state()
    private unfinishedPeriodsStatus: string = "initial";

    @state()
    private missedEntryStatus: string = "initial";

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(listExercises());
        store.dispatch(loadOptions());
        store.dispatch(loadChangelog());
    }

    stateChanged(state: RootState) {
        this.inviteLinks = selectInviteLinks(state);
        this.inviteLinkStatus = selectInviteLinkStatus(state);
        this.exercises = selectVisibleExercises(state);
        this.autoCollapse = selectAutoCollapse(state);
        this.changelog = selectChangelog(state);
        this.unfinishedPeriods = selectUnfinishedPeriods(state);
        this.unfinishedPeriodsStatus = selectUnfinishedPeriodsStatus(state);
        this.missedEntryStatus = selectMissedEntryStatus(state);
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

    private handleClearLinks() {
        store.dispatch(clearInviteLinks());
    }

    private handleExerciseSelect(e: Event) {
        this.selectedExerciseId = (e.target as SlSelect).value as string;
        this.selectedPeriodId = "";
        if (this.selectedExerciseId) {
            store.dispatch(loadUnfinishedPeriods(this.selectedExerciseId));
        } else {
            store.dispatch(clearUnfinishedPeriods());
        }
    }

    private async handleSubmitMissedEntry() {
        if (!this.selectedExerciseId || !this.selectedPeriodId) return;
        await store.dispatch(submitMissedEntry({
            exerciseId: this.selectedExerciseId,
            periodId: this.selectedPeriodId
        }));
        store.dispatch(loadUnfinishedPeriods(this.selectedExerciseId));
        this.selectedPeriodId = "";
    }

    protected render() {
        return html`
            <div class="page-container">
                <page-header heading="Options"></page-header>

                <sl-tab-group placement="top">
                    <!-- Tabs -->
                    <sl-tab slot="nav" panel="general">General</sl-tab>
                    <sl-tab slot="nav" panel="invite">Invite Link</sl-tab>
                    <sl-tab slot="nav" panel="missed-entry">Missed Entry</sl-tab>
                    <sl-tab slot="nav" panel="timer-sound">Timer Sound</sl-tab>
                    <sl-tab slot="nav" panel="changelog">Changelog</sl-tab>

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
                                <reminder-settings></reminder-settings>
                            </div>
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
                                            <sl-button
                                                    variant="neutral"
                                                    @click="${() => this.handleCopyLink(link)}"
                                            >
                                                <sl-icon name="clipboard"></sl-icon>
                                            </sl-button>
                                        </div>
                                    `)}
                                </div>
                            ` : ''}
                            <p class="invite-hint">Links are valid for a limited time and expire after one use.</p>
                        </div>
                    </sl-tab-panel>

                    <sl-tab-panel name="missed-entry">
                        <div class="tab-content">
                            <p>Add a missed entry for an exercise period you completed but forgot to track.</p>
                            <div class="missed-entry-form">
                                <sl-select
                                        label="Exercise"
                                        placeholder="Select an exercise"
                                        @sl-change="${this.handleExerciseSelect}"
                                >
                                    ${this.exercises.map(ex => html`
                                        <sl-option value="${ex.exerciseId}">${ex.exerciseTitle}</sl-option>
                                    `)}
                                </sl-select>
                                <sl-select
                                        label="Period"
                                        placeholder="${this.selectedExerciseId ? (this.unfinishedPeriodsStatus === 'loading' ? 'Loading…' : (this.unfinishedPeriods.length === 0 ? 'No unfinished periods' : 'Select a period')) : 'Select an exercise first'}"
                                        ?disabled="${!this.selectedExerciseId || this.unfinishedPeriods.length === 0}"
                                        @sl-change="${(e: Event) => { this.selectedPeriodId = (e.target as SlSelect).value as string; }}"
                                        .value="${this.selectedPeriodId}"
                                >
                                    ${this.unfinishedPeriods.map(p => html`
                                        <sl-option value="${p.periodId}">${p.label}</sl-option>
                                    `)}
                                </sl-select>
                                ${this.missedEntryStatus === 'error' ? html`
                                    <p class="missed-entry-error">Failed to submit entry. Please try again.</p>
                                ` : ''}
                                <sl-button
                                        variant="primary"
                                        ?disabled="${!this.selectedExerciseId || !this.selectedPeriodId}"
                                        ?loading="${this.missedEntryStatus === 'loading'}"
                                        @click="${this.handleSubmitMissedEntry}"
                                >Submit Entry</sl-button>
                            </div>
                        </div>
                    </sl-tab-panel>

                    <sl-tab-panel name="timer-sound">
                        <div class="tab-content">
                            <div class="wip-notice">
                                <sl-icon name="tools"></sl-icon>
                                Work in progress — this feature is not yet available.
                            </div>
                            <p class="wip-description">
                                In a future release you will be able to choose or upload a custom sound that plays
                                when a timer exercise finishes.
                            </p>
                            <div class="timer-sound-form">
                                <sl-select label="Preset sound" placeholder="Select a sound">
                                    <sl-option value="bell">Bell</sl-option>
                                    <sl-option value="chime">Chime</sl-option>
                                    <sl-option value="beep">Beep</sl-option>
                                </sl-select>
                                <sl-button variant="neutral" disabled>
                                    <sl-icon slot="prefix" name="upload"></sl-icon>
                                    Upload custom sound
                                </sl-button>
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
