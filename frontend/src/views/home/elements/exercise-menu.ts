import {css, html, nothing} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import type {SlMenuItem, SlSelectEvent} from "@shoelace-style/shoelace";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {RootState, store} from "../../../store";
import {touchStyles} from "../../../styles/touch";
import {UserDto} from "../../login/models/userDto";
import {selectCurrentUser} from "../../login/slice/userSlice";
import {selectCanChooseReminders, selectReminders, setExerciseReminder} from "../../options/slice/pushSlice";
import {ExerciseDto} from "../models/exerciseDto";

/** Events of `<exercise-menu>`, without detail. */
export const ExerciseMenuEvents = {
    edit: "menu-edit",
    hide: "menu-hide",
    delete: "menu-delete",
} as const;

/**
 * "⋯" menu of an exercise on the user's list: edit / delete (creator only), hide, and "Remind me" (saved here)
 * when this device gets reminders.
 */
@customElement("exercise-menu")
export class ExerciseMenu extends ConnectedLitElement {

    static styles = [touchStyles, css`
        sl-icon-button {
            font-size: 1.1rem;
            color: var(--app-text-subtle);
        }

        .danger-item::part(base) {
            color: var(--app-danger);
        }
    `];

    @property({attribute: false})
    item: ExerciseDto = {exerciseId: "", exerciseTitle: "", creator: ""} as ExerciseDto;

    @state()
    private user?: UserDto;

    @state()
    private canRemind = false;

    @state()
    private reminders: string[] = [];

    stateChanged(state: RootState) {
        if (state.user.status === "idle") {
            this.user = selectCurrentUser(state);
        }
        this.canRemind = selectCanChooseReminders(state);
        this.reminders = selectReminders(state);
    }

    render() {
        const isCreator = this.user?.username === this.item.creator;
        return html`
            <sl-dropdown placement="bottom-end">
                <sl-icon-button slot="trigger" name="three-dots-vertical" label="More actions"></sl-icon-button>
                <sl-menu @sl-select="${this.select}">
                    ${isCreator ? html`
                        <sl-menu-item value="edit"><sl-icon slot="prefix" name="pencil"></sl-icon>Edit</sl-menu-item>
                    ` : nothing}
                    ${this.canRemind ? html`
                        <sl-menu-item value="reminder" type="checkbox" ?checked="${this.hasReminder()}">
                            Remind me
                        </sl-menu-item>
                    ` : nothing}
                    <sl-menu-item value="hide"><sl-icon slot="prefix" name="eye-slash"></sl-icon>Hide from my list</sl-menu-item>
                    ${isCreator ? html`
                        <sl-divider></sl-divider>
                        <sl-menu-item value="delete" class="danger-item">
                            <sl-icon slot="prefix" name="trash"></sl-icon>Delete
                        </sl-menu-item>
                    ` : nothing}
                </sl-menu>
            </sl-dropdown>
        `;
    }

    private hasReminder() {
        return this.reminders.includes(this.item.exerciseId);
    }

    private select = (e: SlSelectEvent) => {
        switch (e.detail.item.value) {
            case "edit":
                return this.emit(ExerciseMenuEvents.edit);
            case "hide":
                return this.emit(ExerciseMenuEvents.hide);
            case "delete":
                return this.emit(ExerciseMenuEvents.delete);
            case "reminder":
                return this.toggleReminder(e.detail.item);
        }
    }

    private async toggleReminder(menuItem: SlMenuItem) {
        await store.dispatch(setExerciseReminder({exerciseId: this.item.exerciseId, on: menuItem.checked}));
        // failed: the menu shows the real state again
        menuItem.checked = this.hasReminder();
    }

    private emit(type: string) {
        this.dispatchEvent(new CustomEvent(type));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "exercise-menu": ExerciseMenu;
    }
}
