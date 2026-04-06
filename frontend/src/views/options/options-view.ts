import {css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {CustomRouter} from "../../index";
import {generateInviteLink, selectInviteLink, selectInviteLinkStatus} from "./slice/optionsSlice";
import {listExercises, selectAllExercises} from "../home/slice/exerciseSlice";
import {ExerciseDto} from "../home/models/exerciseDto";
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';

@customElement('options-view')
export class OptionsView extends ConnectedLitElement {
    static styles = css`
        :host {
            display: block;
            padding: 1rem;
        }

        .page-container {
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
        }

        .header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 1.5rem;
        }

        .header h2 {
            margin: 0;
        }

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
            opacity: 0.5;
            pointer-events: none;
        }

        .missed-entry-form sl-select,
        .missed-entry-form sl-input {
            width: 100%;
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

        .changelog-entry {
            padding: 0.5rem 0;
            border-bottom: 1px solid var(--sl-color-neutral-100);
        }

        .changelog-entry:last-child {
            border-bottom: none;
        }

        .changelog-version {
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--sl-color-primary-700);
        }

        .changelog-date {
            font-size: 0.8rem;
            color: var(--sl-color-neutral-500);
            margin-left: 8px;
        }

        .changelog-items {
            margin: 0.25rem 0 0 1rem;
            padding: 0;
            list-style: disc;
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            :host {
                padding: 0.5rem;
            }
        }
    `;

    @state()
    private inviteLink: string = "";

    @state()
    private inviteLinkStatus: string = "initial";

    @state()
    private exercises: ExerciseDto[] = [];

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(listExercises());
    }

    stateChanged(state: RootState) {
        this.inviteLink = selectInviteLink(state);
        this.inviteLinkStatus = selectInviteLinkStatus(state);
        this.exercises = selectAllExercises(state);
    }

    private async handleGenerateLink() {
        await store.dispatch(generateInviteLink());
    }

    private async handleCopyLink() {
        if (this.inviteLink) {
            await navigator.clipboard.writeText(this.inviteLink);
        }
    }

    protected render() {
        return html`
            <div class="page-container">
                <div class="header">
                    <sl-button
                            @click="${() => void CustomRouter.goto('/')}"
                            variant="primary"
                    >Back
                    </sl-button>
                    <h2>Options</h2>
                </div>

                <sl-tab-group placement="top">
                    <!-- Invite Links Tab -->
                    <sl-tab slot="nav" panel="invite">Invite Link</sl-tab>
                    <sl-tab slot="nav" panel="missed-entry">Missed Entry</sl-tab>
                    <sl-tab slot="nav" panel="timer-sound">Timer Sound</sl-tab>
                    <sl-tab slot="nav" panel="changelog">Changelog</sl-tab>

                    <sl-tab-panel name="invite">
                        <div class="tab-content">
                            <p>Generate a link to invite someone to join the app. Each link can only be used once.</p>
                            <div class="invite-row">
                                <sl-input
                                        readonly
                                        placeholder="Click 'Generate' to create a link"
                                        .value="${this.inviteLink}"
                                ></sl-input>
                                <sl-button
                                        variant="neutral"
                                        @click="${this.handleCopyLink}"
                                        ?disabled="${!this.inviteLink}"
                                >
                                    <sl-icon name="clipboard"></sl-icon>
                                </sl-button>
                                <sl-button
                                        variant="primary"
                                        ?loading="${this.inviteLinkStatus === 'loading'}"
                                        @click="${this.handleGenerateLink}"
                                >
                                    Generate
                                </sl-button>
                            </div>
                            <p class="invite-hint">Links are valid for a limited time and expire after one use.</p>
                        </div>
                    </sl-tab-panel>

                    <sl-tab-panel name="missed-entry">
                        <div class="tab-content">
                            <div class="wip-notice">
                                <sl-icon name="tools"></sl-icon>
                                Work in progress — this feature is not yet available.
                            </div>
                            <p class="wip-description">
                                In a future release you will be able to request backdated log entries for exercises
                                you completed but forgot to track.
                            </p>
                            <div class="missed-entry-form">
                                <sl-select label="Exercise" placeholder="Select an exercise">
                                    ${this.exercises.map(ex => html`
                                        <sl-option value="${ex.exerciseId}">${ex.exerciseTitle}</sl-option>
                                    `)}
                                </sl-select>
                                <sl-input label="From date" type="date"></sl-input>
                                <sl-input label="To date" type="date"></sl-input>
                                <sl-button variant="primary" disabled>Submit Request</sl-button>
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
                            <div class="changelog-entry">
                                <span class="changelog-version">v0.5</span>
                                <span class="changelog-date">2026-04-06</span>
                                <ul class="changelog-items">
                                    <li>Added Options page with invite link generation</li>
                                    <li>Burger menu now links to Options</li>
                                </ul>
                            </div>
                            <div class="changelog-entry">
                                <span class="changelog-version">v0.4</span>
                                <span class="changelog-date">2025</span>
                                <ul class="changelog-items">
                                    <li>Exercise card collapse/expand on check</li>
                                    <li>Timer exercises with Web Audio finish sound</li>
                                    <li>Responsive layout improvements (360 px screens)</li>
                                </ul>
                            </div>
                            <div class="changelog-entry">
                                <span class="changelog-version">v0.3</span>
                                <span class="changelog-date">2025</span>
                                <ul class="changelog-items">
                                    <li>Groups with invite-only and public visibility</li>
                                    <li>Exercise statistics view</li>
                                    <li>Browse &amp; add public exercises</li>
                                </ul>
                            </div>
                        </div>
                    </sl-tab-panel>
                </sl-tab-group>
            </div>
        `;
    }
}
