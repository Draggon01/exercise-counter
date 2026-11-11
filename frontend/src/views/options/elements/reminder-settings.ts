import {css, html, nothing} from "lit";
import {customElement, state} from "lit/decorators.js";
import type {SlSelect, SlSwitch} from "@shoelace-style/shoelace";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {RootState, store} from "../../../store";
import {settingStyles} from "../../../styles/settings";
import {touchStyles} from "../../../styles/touch";
import {toast} from "../../../components/toast";
import {REMINDER_HOURS, reminderHoursLabel} from "../../../utils/push";
import {disableReminders, enableReminders, loadPushState, selectPush, sendTestReminder} from "../slice/pushSlice";
import {selectReminderHours, setReminderHours} from "../slice/optionsSlice";

/**
 * "Reminders" in the options: turns push notifications on/off for this device, sets how many hours
 * before the reset they come (for all devices) and sends a test. Hidden when the server has no push keys.
 */
@customElement("reminder-settings")
export class ReminderSettings extends ConnectedLitElement {

    static styles = [settingStyles, touchStyles, css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .hint {
            display: flex;
            gap: var(--app-space-2);
            align-items: flex-start;
            font-size: 0.8rem;
            color: var(--app-text-muted);
        }

        .hint sl-icon {
            flex-shrink: 0;
            margin-top: 2px;
            color: var(--app-warning);
        }

        sl-skeleton {
            height: 2.5rem;
            --border-radius: var(--app-radius);
        }
    `];

    @state()
    private push = selectPush(store.getState());

    @state()
    private hours = 3;

    @state()
    private testing = false;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(loadPushState());
    }

    stateChanged(state: RootState) {
        this.push = selectPush(state);
        this.hours = selectReminderHours(state);
    }

    /** Not offered by this server: the element takes no room in the settings list. */
    protected willUpdate() {
        this.hidden = this.push.status === "error" || (this.push.status === "idle" && !this.push.serverEnabled);
    }

    render() {
        const push = this.push;
        if (push.status === "initial" || push.status === "loading") {
            return html`<sl-skeleton effect="pulse"></sl-skeleton>`;
        }
        if (push.status === "error" || !push.serverEnabled) {
            return nothing; // reminders are not offered by this server
        }
        return html`
            <div class="setting-row">
                <div>
                    <div class="setting-label">Reminders</div>
                    <div class="setting-description">
                        A notification on this device when an exercise is not done yet shortly before it resets.
                    </div>
                </div>
                ${this.canSwitch() ? html`
                    <sl-switch ?checked="${push.subscribed}" ?disabled="${push.busy}" @sl-change="${this.toggle}"
                               aria-label="Reminders on this device"></sl-switch>
                ` : nothing}
            </div>
            ${this.renderHint()}
            ${push.subscribed ? html`
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Remind me</div>
                        <div class="setting-description">This long before the reset – the same on all your devices.</div>
                    </div>
                    <sl-select class="setting-control" size="small" .value="${String(this.hours)}"
                               @sl-change="${this.changeHours}">
                        ${REMINDER_HOURS.map(h => html`<sl-option value="${h}">${reminderHoursLabel(h)}</sl-option>`)}
                    </sl-select>
                </div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Test</div>
                        <div class="setting-description">Check that notifications arrive on your devices.</div>
                    </div>
                    <sl-button size="small" ?loading="${this.testing}" @click="${this.sendTest}">
                        <sl-icon slot="prefix" name="bell"></sl-icon>
                        Send test
                    </sl-button>
                </div>
            ` : nothing}
        `;
    }

    private canSwitch() {
        const push = this.push;
        return push.support === "supported" && push.serviceWorker && (push.permission !== "denied" || push.subscribed);
    }

    /** Why the switch is missing (and what to do). */
    private renderHint() {
        const push = this.push;
        let text: string | undefined;
        if (push.support === "install-first") {
            text = "On iPhone and iPad, add the app to your home screen first (Share → Add to Home Screen) " +
                "and open it from there to turn on reminders.";
        } else if (push.support === "unsupported") {
            text = "This browser cannot show notifications.";
        } else if (!push.serviceWorker) {
            text = "Reminders work in the installed app – reload the page once if you just opened it.";
        } else if (push.permission === "denied" && !push.subscribed) {
            text = "Notifications are blocked for this site. Allow them in your browser settings to get reminders.";
        }
        return text ? html`<div class="hint"><sl-icon name="info-circle"></sl-icon><span>${text}</span></div>` : nothing;
    }

    private toggle = async (e: Event) => {
        const control = e.target as SlSwitch;
        const on = control.checked;
        if (on && this.push.publicKey) {
            const result = await store.dispatch(enableReminders(this.push.publicKey));
            if (enableReminders.fulfilled.match(result)) {
                toast("Reminders are on for this device", "success", 3000);
            }
        } else {
            await store.dispatch(disableReminders());
        }
        // failed (permission denied, offline): the switch shows the real state again
        control.checked = selectPush(store.getState()).subscribed;
    }

    private changeHours = (e: Event) => {
        store.dispatch(setReminderHours(Number((e.target as SlSelect).value)));
    }

    private sendTest = async () => {
        this.testing = true;
        const result = await store.dispatch(sendTestReminder());
        this.testing = false;
        if (sendTestReminder.fulfilled.match(result)) {
            const {delivered} = result.payload;
            if (delivered > 0) {
                toast(`Test sent to ${delivered === 1 ? "1 device" : `${delivered} devices`}`, "success", 3000);
            } else {
                toast("The test could not be delivered – turn reminders off and on again", "warning");
            }
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "reminder-settings": ReminderSettings;
    }
}
