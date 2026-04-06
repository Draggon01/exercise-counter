import {css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {CustomRouter} from "../../index";
import {generateInviteLink, selectInviteLink, selectInviteLinkStatus} from "./slice/optionsSlice";
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/details/details.js';

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

        .section {
            margin-bottom: 1.5rem;
            border: 1px solid var(--sl-color-neutral-200);
            border-radius: 8px;
            padding: 1rem;
        }

        .section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0 0 1rem 0;
            font-size: 1.1rem;
            font-weight: 600;
        }

        .invite-row {
            display: flex;
            align-items: flex-end;
            gap: 8px;
        }

        .invite-row sl-input {
            flex: 1;
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

    stateChanged(state: RootState) {
        this.inviteLink = selectInviteLink(state);
        this.inviteLinkStatus = selectInviteLinkStatus(state);
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

                <!-- Invite Links Section -->
                <div class="section">
                    <h3 class="section-title">
                        Invite Link
                    </h3>
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
                    <p style="font-size: 0.8rem; color: var(--sl-color-neutral-500); margin-top: 0.5rem;">
                        Links are valid for a limited time and expire after one use.
                    </p>
                </div>

                <!-- Missed Entry Request Section (WIP) -->
                <div class="section">
                    <h3 class="section-title">
                        Missed Entry Request
                    </h3>
                    <div class="wip-notice">
                        <sl-icon name="tools"></sl-icon>
                        Work in progress — this feature is not yet available.
                    </div>
                    <p style="margin-top: 1rem; color: var(--sl-color-neutral-500); font-size: 0.875rem;">
                        In a future release you will be able to request backdated log entries for exercises
                        you completed but forgot to track.
                    </p>
                </div>

                <!-- Timer Sound Section (WIP) -->
                <div class="section">
                    <h3 class="section-title">
                        Timer Sound
                    </h3>
                    <div class="wip-notice">
                        <sl-icon name="tools"></sl-icon>
                        Work in progress — this feature is not yet available.
                    </div>
                    <p style="margin-top: 1rem; color: var(--sl-color-neutral-500); font-size: 0.875rem;">
                        In a future release you will be able to choose or upload a custom sound that plays
                        when a timer exercise finishes.
                    </p>
                </div>

                <!-- Changelog Section (WIP) -->
                <div class="section">
                    <h3 class="section-title">
                        Changelog
                    </h3>
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
            </div>
        `;
    }
}
