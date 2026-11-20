import {css, html, nothing} from "lit";
import {customElement, state} from "lit/decorators.js";
import type {SlSelect, SlSwitch} from "@shoelace-style/shoelace";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {RootState, store} from "../../../store";
import {settingStyles} from "../../../styles/settings";
import {touchStyles} from "../../../styles/touch";
import {toast} from "../../../components/toast";
import {REMINDER_HOURS, reminderHoursLabel} from "../../../utils/push";
import {
    disableReminders,
    enableReminders,
    loadPushState,
    loadReminders,
    selectPush,
    sendTestReminder,
    setExerciseReminder
} from "../slice/pushSlice";
import {selectReminderHours, setReminderHours} from "../slice/optionsSlice";
import {listExercisesSelected, selectAllExercises, selectExercisesStatus} from "../../home/slice/exerciseSlice";
import {ExerciseDto} from "../../home/models/exerciseDto";
import "./reminder-setup-guide";

/**
 * "Reminders" in the options: turns push notifications on/off for this device, chooses the exercises to be
 * reminded of, sets how many hours before the reset they come (for all devices) and sends a test.
 * The setup guide explains Safari / Chrome. Hidden when the server has no push keys.
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

        .hint-text {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: var(--app-space-1);
        }

        .exercise-list {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-2);
            margin-top: var(--app-space-2);
        }

        .exercise-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--app-space-3);
            color: var(--app-text);
            overflow-wrap: anywhere;
        }

        .no-exercises {
            font-size: 0.85rem;
            color: var(--app-text-subtle);
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

    @state()
    private exercises: ExerciseDto[] = [];

    @state()
    private guideOpen = false;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(loadPushState());
        store.dispatch(loadReminders());
        if (selectExercisesStatus(store.getState()) === "initial") {
            store.dispatch(listExercisesSelected());
        }
    }

    stateChanged(state: RootState) {
        this.push = selectPush(state);
        this.hours = selectReminderHours(state);
        this.exercises = selectAllExercises(state);
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
                ${this.renderExercises()}
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
            <div class="setting-row">
                <div>
                    <div class="setting-label">Not working?</div>
                    <div class="setting-description">How to set up reminders in Safari and Chrome.</div>
                </div>
                <sl-button size="small" @click="${() => this.guideOpen = true}">
                    <sl-icon slot="prefix" name="question-circle"></sl-icon>
                    Setup guide
                </sl-button>
            </div>
            <reminder-setup-guide ?open="${this.guideOpen}"
                                  @close="${() => this.guideOpen = false}"></reminder-setup-guide>
        `;
    }

    /** Which exercises of the home list are reminded (on all devices). */
    private renderExercises() {
        const reminders = new Set(this.push.reminders);
        const allOn = this.exercises.length > 0 && this.exercises.every(e => reminders.has(e.exerciseId));
        return html`
            <div>
                <div class="setting-row">
                    <div>
                        <div class="setting-label">Remind me about</div>
                        <div class="setting-description">
                            Only these exercises are reminded – also in the ⋯ menu of each exercise.
                        </div>
                    </div>
                    ${this.exercises.length > 0 ? html`
                        <sl-button size="small" variant="text" @click="${() => this.setAll(!allOn)}">
                            ${allOn ? "None" : "All"}
                        </sl-button>
                    ` : nothing}
                </div>
                <div class="exercise-list">
                    ${this.exercises.length === 0
                            ? html`<span class="no-exercises">No exercises on your home page yet.</span>`
                            : this.exercises.map(exercise => html`
                                <div class="exercise-row">
                                    <span>${exercise.exerciseTitle}</span>
                                    <sl-switch size="small" ?checked="${reminders.has(exercise.exerciseId)}"
                                               aria-label="Remind me about ${exercise.exerciseTitle}"
                                               @sl-change="${(e: Event) => this.setReminder(exercise.exerciseId, e.target as SlSwitch)}">
                                    </sl-switch>
                                </div>
                            `)}
                </div>
            </div>
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
        return text ? html`
            <div class="hint">
                <sl-icon name="info-circle"></sl-icon>
                <span class="hint-text">
                    <span>${text}</span>
                    <sl-button size="small" variant="text" @click="${() => this.guideOpen = true}">
                        Show me how
                    </sl-button>
                </span>
            </div>` : nothing;
    }

    private toggle = async (e: Event) => {
        const control = e.target as SlSwitch;
        const on = control.checked;
        if (on && this.push.publicKey) {
            const result = await store.dispatch(enableReminders(this.push.publicKey));
            if (enableReminders.fulfilled.match(result)) {
                toast(this.push.reminders.length > 0
                        ? "Reminders are on for this device"
                        : "Reminders are on – now choose the exercises to be reminded of", "success", 4000);
            }
        } else {
            await store.dispatch(disableReminders());
        }
        // failed (permission denied, offline): the switch shows the real state again
        control.checked = selectPush(store.getState()).subscribed;
    }

    private setReminder = async (exerciseId: string, control: SlSwitch) => {
        await store.dispatch(setExerciseReminder({exerciseId, on: control.checked}));
        // failed: the switch shows the real state again
        control.checked = selectPush(store.getState()).reminders.includes(exerciseId);
    }

    private setAll = (on: boolean) => {
        const reminders = new Set(this.push.reminders);
        this.exercises
            .filter(exercise => reminders.has(exercise.exerciseId) !== on)
            .forEach(exercise => store.dispatch(setExerciseReminder({exerciseId: exercise.exerciseId, on})));
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
