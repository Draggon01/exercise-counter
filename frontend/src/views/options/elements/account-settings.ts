import {css, html, nothing} from "lit";
import {customElement, query, state} from "lit/decorators.js";
import type {SlSelect} from "@shoelace-style/shoelace";
import {ConnectedLitElement} from "../../../connectedLitElement";
import {RootState, store} from "../../../store";
import {settingStyles} from "../../../styles/settings";
import {touchStyles} from "../../../styles/touch";
import {fullscreenDialogStyles} from "../../../styles/dialog";
import {toast} from "../../../components/toast";
import {navigate} from "../../../utils/navigation";
import {MIN_PASSWORD_LENGTH, newPasswordProblem} from "../../../utils/password";
import {logoutUser, selectCurrentUser} from "../../login/slice/userSlice";
import {changePassword, clearResetLink, createResetLink, loadUsernames, PasswordResetLinkDto, selectResetLink, selectUsernames} from "../slice/accountSlice";

/**
 * Options → General → account: who is logged in, log out, change password; for admins (APP_ADMINS)
 * reset links for people who forgot their password.
 */
@customElement("account-settings")
export class AccountSettings extends ConnectedLitElement {

    static styles = [settingStyles, touchStyles, fullscreenDialogStyles, css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        form {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        .reset {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-3);
        }

        .reset-row {
            display: flex;
            gap: var(--app-space-2);
            align-items: flex-end;
        }

        .reset-row sl-select {
            flex: 1;
        }

        .link-row {
            display: flex;
            gap: var(--app-space-2);
            align-items: center;
        }

        .link-row sl-input {
            flex: 1;
        }
    `];

    @state()
    private username = "";

    @state()
    private admin = false;

    @state()
    private usernames: string[] = [];

    @state()
    private resetLink: PasswordResetLinkDto | null = null;

    @state()
    private dialogOpen = false;

    @state()
    private saving = false;

    /** Problem of the entered new password (shown in the dialog). */
    @state()
    private problem = "";

    @state()
    private resetFor = "";

    @query("form")
    private form?: HTMLFormElement;

    connectedCallback() {
        super.connectedCallback();
        if (selectCurrentUser(store.getState())?.admin) {
            store.dispatch(loadUsernames());
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        store.dispatch(clearResetLink()); // the link is shown once
    }

    stateChanged(state: RootState) {
        const user = selectCurrentUser(state);
        this.username = user?.username ?? "";
        this.admin = !!user?.admin;
        this.usernames = selectUsernames(state);
        this.resetLink = selectResetLink(state);
    }

    render() {
        return html`
            <div class="setting-row">
                <div>
                    <div class="setting-label">Account</div>
                    <div class="setting-description">Signed in as <strong>${this.username}</strong></div>
                </div>
                <sl-button size="small" @click="${this.logout}">
                    <sl-icon slot="prefix" name="box-arrow-right"></sl-icon>
                    Log out
                </sl-button>
            </div>
            <div class="setting-row">
                <div>
                    <div class="setting-label">Password</div>
                    <div class="setting-description">Change the password you log in with.</div>
                </div>
                <sl-button size="small" @click="${this.openDialog}">
                    <sl-icon slot="prefix" name="key"></sl-icon>
                    Change
                </sl-button>
            </div>
            ${this.admin ? this.renderReset() : nothing}
            ${this.renderDialog()}
        `;
    }

    private renderReset() {
        return html`
            <div class="reset">
                <div>
                    <div class="setting-label">Forgotten passwords (admin)</div>
                    <div class="setting-description">
                        Create a link for someone who forgot their password and send it to them. It works once
                        and for 24 hours; a new link replaces the old one.
                    </div>
                </div>
                <div class="reset-row">
                    <sl-select size="small" placeholder="Choose a user" .value="${this.resetFor}"
                               @sl-change="${(e: Event) => this.resetFor = (e.target as SlSelect).value as string}">
                        ${this.usernames.map(name => html`<sl-option value="${name}">${name}</sl-option>`)}
                    </sl-select>
                    <sl-button size="small" variant="primary" ?disabled="${!this.resetFor}" @click="${this.createLink}">
                        Create link
                    </sl-button>
                </div>
                ${this.resetLink ? html`
                    <div class="link-row">
                        <sl-input size="small" readonly .value="${this.resetLink.link}"
                                  label="Link for ${this.resetLink.username}"
                                  help-text="Valid until ${new Date(this.resetLink.expiresAt).toLocaleString()}"></sl-input>
                        <sl-icon-button name="copy" label="Copy link" @click="${this.copyLink}"></sl-icon-button>
                    </div>
                ` : nothing}
            </div>
        `;
    }

    private renderDialog() {
        return html`
            <sl-dialog label="Change password" .open="${this.dialogOpen}"
                       @sl-after-hide="${(e: Event) => e.target === e.currentTarget && this.closeDialog()}">
                <form @submit="${this.submit}">
                    ${this.problem ? html`
                        <sl-alert variant="danger" open>
                            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
                            ${this.problem}
                        </sl-alert>` : nothing}
                    <sl-input name="current" type="password" label="Current password" autocomplete="current-password"
                              required password-toggle></sl-input>
                    <sl-input name="new" type="password" label="New password" autocomplete="new-password"
                              help-text="At least ${MIN_PASSWORD_LENGTH} characters" required password-toggle></sl-input>
                    <sl-input name="repeat" type="password" label="Repeat new password" autocomplete="new-password"
                              enterkeyhint="done" required password-toggle></sl-input>
                    <button type="submit" hidden></button>
                </form>
                <sl-button slot="footer" @click="${() => this.dialogOpen = false}">Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?loading="${this.saving}" @click="${() => this.form?.requestSubmit()}">
                    Change password
                </sl-button>
            </sl-dialog>
        `;
    }

    private logout = async () => {
        await store.dispatch(logoutUser());
        navigate("/login");
    }

    private openDialog = () => {
        this.problem = "";
        this.dialogOpen = true;
    }

    private closeDialog() {
        this.dialogOpen = false;
        this.problem = "";
        this.form?.reset();
    }

    private submit = async (e: SubmitEvent) => {
        e.preventDefault();
        const data = new FormData(e.target as HTMLFormElement);
        const currentPassword = data.get("current")?.toString() ?? "";
        const newPassword = data.get("new")?.toString() ?? "";
        this.problem = newPasswordProblem(newPassword, data.get("repeat")?.toString() ?? "") ?? "";
        if (this.problem) return;
        this.saving = true;
        const result = await store.dispatch(changePassword({currentPassword, newPassword}));
        this.saving = false;
        if (changePassword.fulfilled.match(result)) {
            this.dialogOpen = false;
            toast("Password changed", "success", 3000);
        } else {
            this.problem = result.payload?.message ?? "The password could not be changed.";
        }
    }

    private createLink = () => {
        store.dispatch(createResetLink(this.resetFor));
    }

    private copyLink = async () => {
        if (!this.resetLink) return;
        try {
            await navigator.clipboard.writeText(this.resetLink.link);
            toast("Link copied", "success", 2000);
        } catch {
            toast("Could not copy – please copy the link manually", "warning");
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "account-settings": AccountSettings;
    }
}
