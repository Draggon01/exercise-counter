import {css, html, nothing} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from "../../store";
import {navigate} from "../../utils/navigation";
import {toast} from "../../components/toast";
import {MIN_PASSWORD_LENGTH, newPasswordProblem} from "../../utils/password";
import {checkResetLink, selectResetPassword, setNewPassword} from "./slice/resetPasswordSlice";
import "../../components/auth-card";

/** Page of a password reset link (/reset-password/:token), created by an admin in the options. */
@customElement("reset-password-view")
export class ResetPasswordView extends ConnectedLitElement {

    static styles = css`
        form {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        a {
            color: var(--app-accent);
        }

        .checking {
            display: flex;
            justify-content: center;
            padding: var(--app-space-4);
            font-size: 1.5rem;
        }
    `;

    /** From the link /reset-password/:token. */
    @property()
    token = "";

    @state()
    private status = "initial";

    @state()
    private username = "";

    @state()
    private problem = "";

    @state()
    private saving = false;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(checkResetLink(this.token));
    }

    stateChanged(state: RootState) {
        const reset = selectResetPassword(state);
        this.status = reset.status;
        this.username = reset.username;
    }

    render() {
        return html`
            <auth-card heading="Set a new password"
                       subtitle="${this.status === "idle" ? `for ${this.username}` : ""}">
                ${this.status === "error" ? html`
                    <sl-alert variant="warning" open>
                        <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
                        This link is not valid anymore – it was already used, has expired or a newer one was created.
                        Please ask for a new link.
                    </sl-alert>
                ` : this.status !== "idle" ? html`
                    <div class="checking" role="status" aria-label="Checking the link"><sl-spinner></sl-spinner></div>
                ` : html`
                    <form @submit="${this.submit}">
                        ${this.problem ? html`
                            <sl-alert variant="danger" open>
                                <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
                                ${this.problem}
                            </sl-alert>` : nothing}
                        <!-- lets password managers save the new password for the right account -->
                        <input type="text" name="username" autocomplete="username" .value="${this.username}" hidden>
                        <sl-input name="password1" type="password" label="New password" autocomplete="new-password"
                                  help-text="At least ${MIN_PASSWORD_LENGTH} characters" required password-toggle autofocus></sl-input>
                        <sl-input name="password2" type="password" label="Repeat new password" autocomplete="new-password"
                                  enterkeyhint="go" required password-toggle></sl-input>
                        <sl-button type="submit" variant="primary" size="large" ?loading="${this.saving}">
                            Save password
                        </sl-button>
                    </form>
                `}
                <span slot="footer"><a href="/login" @click="${this.toLogin}">Back to log in</a></span>
            </auth-card>
        `;
    }

    private submit = async (e: SubmitEvent) => {
        e.preventDefault();
        const data = new FormData(e.target as HTMLFormElement);
        const newPassword = data.get("password1")?.toString() ?? "";
        this.problem = newPasswordProblem(newPassword, data.get("password2")?.toString() ?? "") ?? "";
        if (this.problem) return;
        this.saving = true;
        const result = await store.dispatch(setNewPassword({token: this.token, newPassword}));
        this.saving = false;
        if (setNewPassword.fulfilled.match(result)) {
            toast("Password saved – you can log in now", "success", 4000);
            navigate("/login");
        }
    }

    private toLogin = (e: Event) => {
        e.preventDefault();
        navigate("/login");
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "reset-password-view": ResetPasswordView;
    }
}
