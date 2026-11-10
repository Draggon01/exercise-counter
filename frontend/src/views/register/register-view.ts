import {css, html, LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {store} from "../../store";
import {registerUser} from "../login/slice/userSlice";
import {navigate} from "../../utils/navigation";
import {checkUsernameAvailable, validateRegisterId} from "./slice/registerSlice";
import "../../components/auth-card";

@customElement('register-view')
export class RegisterView extends LitElement {

    static styles = css`
        form {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        a {
            color: var(--app-accent);
        }

        .validating {
            display: flex;
            justify-content: center;
            padding: var(--app-space-4);
            font-size: 1.5rem;
        }
    `;

    /** Id from the invite link (/register/:id). */
    @property()
    registerId?: string;

    @state()
    private errorMessage = "";

    @state()
    private validating = true;

    @state()
    private loading = false;

    protected async firstUpdated() {
        if (!this.registerId) {
            navigate("/login");
            return;
        }
        const result = await store.dispatch(validateRegisterId(this.registerId));
        if (!validateRegisterId.fulfilled.match(result) || result.payload !== true) {
            navigate("/login");
            return;
        }
        this.validating = false;
    }

    private async _register(event: SubmitEvent) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        const username = formData.get("username")?.toString().trim() ?? "";
        const password = formData.get("password1")?.toString() ?? "";
        this.errorMessage = "";

        if (password !== formData.get("password2")?.toString()) {
            this.errorMessage = "The passwords do not match.";
            return;
        }

        this.loading = true;
        try {
            const available = await store.dispatch(checkUsernameAvailable(username));
            if (!checkUsernameAvailable.fulfilled.match(available) || !available.payload) {
                this.errorMessage = "This username is already taken. Please choose another one.";
                return;
            }
            const result = await store.dispatch(registerUser({username, password, registerId: this.registerId!}));
            if (registerUser.fulfilled.match(result)) {
                navigate("/");
            } else {
                this.errorMessage = result.payload?.message ?? "Registration failed. Please try again.";
            }
        } finally {
            this.loading = false;
        }
    }

    render() {
        return html`
            <auth-card heading="Create your account" subtitle="You were invited to join Exercise Counter.">
                ${this.validating ? html`
                    <div class="validating" role="status" aria-label="Checking invite link"><sl-spinner></sl-spinner></div>
                ` : html`
                    <form @submit=${this._register}>
                        ${this.errorMessage ? html`
                            <sl-alert variant="danger" open>
                                <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
                                ${this.errorMessage}
                            </sl-alert>` : ""}
                        <sl-input name="username" label="Username" autocomplete="username" required autofocus></sl-input>
                        <sl-input name="password1" type="password" label="Password" autocomplete="new-password"
                                  required password-toggle></sl-input>
                        <sl-input name="password2" type="password" label="Repeat password" autocomplete="new-password"
                                  required password-toggle></sl-input>
                        <sl-button type="submit" variant="primary" size="large" ?loading="${this.loading}">
                            Create account
                        </sl-button>
                    </form>
                `}
                <span slot="footer">Already have an account? <a href="/login" @click="${(e: Event) => {
                    e.preventDefault();
                    navigate("/login");
                }}">Log in</a></span>
            </auth-card>
        `;
    }
}
