import {css, html, LitElement, nothing} from "lit";
import {customElement, query, state} from "lit/decorators.js";
import {settingStyles} from "../../../styles/settings";
import {touchStyles} from "../../../styles/touch";
import {fullscreenDialogStyles} from "../../../styles/dialog";
import {store} from "../../../store";
import {toast} from "../../../components/toast";
import {navigate} from "../../../utils/navigation";
import {logoutUser} from "../../login/slice/userSlice";
import {deleteAccount} from "../slice/accountSlice";

/**
 * Options → General: delete the own account. The dialog says what happens (shared exercises go to the most
 * active other person, the rest is deleted) and needs the password.
 */
@customElement("delete-account")
export class DeleteAccount extends LitElement {

    static styles = [settingStyles, touchStyles, fullscreenDialogStyles, css`
        form {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        ul {
            margin: 0;
            padding-left: 1.2rem;
            display: flex;
            flex-direction: column;
            gap: var(--app-space-2);
            color: var(--app-text-muted);
            font-size: 0.9rem;
        }
    `];

    @state()
    private open = false;

    @state()
    private deleting = false;

    @state()
    private problem = "";

    @query("form")
    private form?: HTMLFormElement;

    render() {
        return html`
            <div class="setting-row">
                <div>
                    <div class="setting-label">Delete account</div>
                    <div class="setting-description">Removes your account and your data for good.</div>
                </div>
                <sl-button size="small" variant="danger" outline @click="${this.openDialog}">
                    <sl-icon slot="prefix" name="trash"></sl-icon>
                    Delete…
                </sl-button>
            </div>
            <sl-dialog label="Delete your account?" .open="${this.open}"
                       @sl-after-hide="${(e: Event) => e.target === e.currentTarget && this.close()}">
                <form @submit="${this.submit}">
                    <ul>
                        <li>Your progress, statistics, options, groups and reminders are deleted.</li>
                        <li>Exercises you created that others also use go to the person who did them most often.</li>
                        <li>Exercises only you used are deleted.</li>
                        <li>You are logged out on all your devices. This cannot be undone.</li>
                    </ul>
                    ${this.problem ? html`
                        <sl-alert variant="danger" open>
                            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
                            ${this.problem}
                        </sl-alert>` : nothing}
                    <sl-input name="password" type="password" label="Your password to confirm"
                              autocomplete="current-password" enterkeyhint="done" required password-toggle></sl-input>
                    <button type="submit" hidden></button>
                </form>
                <sl-button slot="footer" @click="${() => this.open = false}">Cancel</sl-button>
                <sl-button slot="footer" variant="danger" ?loading="${this.deleting}"
                           @click="${() => this.form?.requestSubmit()}">
                    Delete my account
                </sl-button>
            </sl-dialog>
        `;
    }

    private openDialog = () => {
        this.problem = "";
        this.open = true;
    }

    private close() {
        this.open = false;
        this.problem = "";
        this.form?.reset();
    }

    private submit = async (e: SubmitEvent) => {
        e.preventDefault();
        const password = new FormData(e.target as HTMLFormElement).get("password")?.toString() ?? "";
        this.deleting = true;
        const result = await store.dispatch(deleteAccount(password));
        this.deleting = false;
        if (deleteAccount.fulfilled.match(result)) {
            this.open = false;
            await store.dispatch(logoutUser()); // the session is already gone: resets the app state
            navigate("/login");
            toast("Your account was deleted", "success", 4000);
        } else {
            this.problem = result.payload?.status === 400
                ? "The password is wrong."
                : result.payload?.message ?? "The account could not be deleted.";
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "delete-account": DeleteAccount;
    }
}
