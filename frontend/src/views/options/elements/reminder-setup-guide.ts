import {css, html, LitElement, TemplateResult} from "lit";
import {customElement, property} from "lit/decorators.js";
import {fullscreenDialogStyles} from "../../../styles/dialog";
import {touchStyles} from "../../../styles/touch";
import {SetupPlatform, setupPlatform} from "../../../utils/push";

/** Events of {@link ReminderSetupGuide}. */
export const ReminderSetupGuideEvents = {
    close: "close",
} as const;

type Guide = { platform: SetupPlatform, tab: string, setup: TemplateResult, fix: TemplateResult };

const GUIDES: Guide[] = [
    {
        platform: "ios",
        tab: "iPhone / iPad",
        setup: html`
            <ol>
                <li>You need iOS / iPadOS 16.4 or newer.</li>
                <li>Open this page in <b>Safari</b>.</li>
                <li>Tap <b>Share</b> <sl-icon name="box-arrow-up" label="Share"></sl-icon> → <b>Add to Home Screen</b> → <b>Add</b>.</li>
                <li>Close Safari and open the app from the new icon on your home screen. Reminders do not work in the
                    Safari tab – only in the app.</li>
                <li>Log in, go to <b>Options → Reminders</b>, turn on <b>Reminders</b> and tap <b>Allow</b>.</li>
                <li>Turn on <b>Remind me</b> for your exercises (in the ⋯ menu of a card or below the reminder switch).</li>
                <li>Tap <b>Send test</b> – a notification should arrive within a few seconds.</li>
            </ol>`,
        fix: html`
            <ul>
                <li>No switch? You are still in Safari – open the app from the home screen icon.</li>
                <li>Blocked: <b>Settings → Notifications → ExCount</b> → turn on <b>Allow Notifications</b>.</li>
                <li>A Focus (Do Not Disturb, Sleep) hides notifications – allow the app in the Focus settings.</li>
                <li>Still nothing: delete the app from the home screen and add it again.</li>
            </ul>`,
    },
    {
        platform: "mac-safari",
        tab: "Mac (Safari)",
        setup: html`
            <ol>
                <li>You need macOS 13 (Ventura) and Safari 16 or newer.</li>
                <li>Open <b>Options → Reminders</b>, turn on <b>Reminders</b> and click <b>Allow</b>.</li>
                <li>Optional: <b>File → Add to Dock</b> (macOS 14+) makes it an app that also gets reminders
                    while Safari is closed – turn reminders on again inside that app.</li>
                <li>Turn on <b>Remind me</b> for your exercises and click <b>Send test</b>.</li>
            </ol>`,
        fix: html`
            <ul>
                <li>Blocked: <b>Safari → Settings → Websites → Notifications</b> → set this site to <b>Allow</b>.</li>
                <li><b>System Settings → Notifications → Safari</b> (or the app in the Dock) → <b>Allow notifications</b>.</li>
                <li>Without the Dock app reminders only arrive while Safari is open.</li>
            </ul>`,
    },
    {
        platform: "android",
        tab: "Android (Chrome)",
        setup: html`
            <ol>
                <li>Open this page in <b>Chrome</b>.</li>
                <li>Recommended: <b>⋮ → Add to Home screen → Install</b> and open the app from its icon.</li>
                <li>Go to <b>Options → Reminders</b>, turn on <b>Reminders</b> and tap <b>Allow</b>.</li>
                <li>Turn on <b>Remind me</b> for your exercises and tap <b>Send test</b>.</li>
            </ol>`,
        fix: html`
            <ul>
                <li>No switch? Reload the page once – the app has to finish loading in the background first.</li>
                <li>Blocked: tap the icon left of the address <sl-icon name="sliders" label="Site settings"></sl-icon>
                    → <b>Permissions → Notifications</b> → <b>Allow</b>.</li>
                <li><b>Android Settings → Apps → Chrome</b> (or ExCount) → <b>Notifications</b> → on.</li>
                <li>Battery saver can delay notifications – set Chrome's battery usage to <b>Unrestricted</b>.</li>
            </ul>`,
    },
    {
        platform: "desktop-chrome",
        tab: "Computer (Chrome)",
        setup: html`
            <ol>
                <li>Open this page in <b>Chrome</b> (Edge works the same way).</li>
                <li>Optional: install it as an app with the install icon <sl-icon name="window-plus" label="Install"></sl-icon>
                    in the address bar.</li>
                <li>Go to <b>Options → Reminders</b>, turn on <b>Reminders</b> and click <b>Allow</b>.</li>
                <li>Turn on <b>Remind me</b> for your exercises and click <b>Send test</b>.</li>
            </ol>`,
        fix: html`
            <ul>
                <li>Blocked: click the icon left of the address <sl-icon name="sliders" label="Site settings"></sl-icon>
                    → <b>Site settings → Notifications</b> → <b>Allow</b>, then reload the page.</li>
                <li>Windows: <b>Settings → System → Notifications</b> → turn on Chrome. Mac:
                    <b>System Settings → Notifications → Google Chrome</b> → <b>Allow notifications</b>.</li>
                <li>Reminders only arrive while Chrome runs (it may run in the background).</li>
                <li>"Do not disturb" / Focus hides notifications.</li>
            </ul>`,
    },
];

/**
 * Step-by-step guide for turning on reminders in Safari (iPhone, iPad, Mac) and Chrome (Android, computer),
 * with what to check when notifications do not arrive. Opens on the tab that fits the current browser.
 */
@customElement("reminder-setup-guide")
export class ReminderSetupGuide extends LitElement {

    static styles = [fullscreenDialogStyles, touchStyles, css`
        h3 {
            margin: var(--app-space-4) 0 var(--app-space-2);
            font-size: 0.95rem;
            color: var(--app-text);
        }

        ol, ul {
            margin: 0;
            padding-left: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: var(--app-space-2);
            line-height: 1.45;
            color: var(--app-text);
        }

        sl-icon {
            vertical-align: -2px;
        }

        sl-tab-panel::part(base) {
            padding: var(--app-space-3) 0;
        }
    `];

    @property({type: Boolean})
    open = false;

    private readonly platform = setupPlatform(navigator.userAgent, navigator.maxTouchPoints);

    render() {
        return html`
            <sl-dialog label="Set up reminders" ?open="${this.open}" @sl-after-hide="${this.closed}">
                <sl-tab-group>
                    ${GUIDES.map(guide => html`
                        <sl-tab slot="nav" panel="${guide.platform}" ?active="${guide.platform === this.platform}">
                            ${guide.tab}
                        </sl-tab>
                    `)}
                    ${GUIDES.map(guide => html`
                        <sl-tab-panel name="${guide.platform}" ?active="${guide.platform === this.platform}">
                            <h3>Turn reminders on</h3>
                            ${guide.setup}
                            <h3>Notifications do not arrive?</h3>
                            ${guide.fix}
                        </sl-tab-panel>
                    `)}
                </sl-tab-group>
                <sl-button slot="footer" variant="primary" @click="${() => this.open = false}">Got it</sl-button>
            </sl-dialog>
        `;
    }

    private closed = (e: Event) => {
        // sl-after-hide of tooltips etc. bubbles too – only the dialog itself closes the guide
        if (e.target !== e.currentTarget) return;
        this.open = false;
        this.dispatchEvent(new CustomEvent<void>(ReminderSetupGuideEvents.close));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "reminder-setup-guide": ReminderSetupGuide;
    }
}
