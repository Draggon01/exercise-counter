import {css, html, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createRef, ref, Ref} from "lit/directives/ref.js";
import {store} from "../../store";
import {saveUserInfo} from "./slice/userSlice";
import {navigate} from "../../utils/navigation";
import "../../components/auth-card";
import type {SlInput} from "@shoelace-style/shoelace";

@customElement('login-view')
export class LoginView extends LitElement {

    static styles = css`
        form {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }
    `;

    @state()
    private errorMessage = "";

    @state()
    private loading = false;

    private passwordRef: Ref<SlInput> = createRef();

    private async _login(event: SubmitEvent) {
        event.preventDefault();
        const formData = new FormData(event.target as HTMLFormElement);
        this.errorMessage = "";
        this.loading = true;
        const result = await store.dispatch(saveUserInfo(new URLSearchParams({
            username: formData.get("username")?.toString() ?? "",
            password: formData.get("password")?.toString() ?? "",
        })));
        this.loading = false;
        if (saveUserInfo.fulfilled.match(result)) {
            navigate("/");
        } else {
            this.errorMessage = result.payload?.status === 0
                ? "Server not reachable. Please try again later."
                : "Wrong username or password.";
            if (this.passwordRef.value) {
                this.passwordRef.value.value = "";
                this.passwordRef.value.focus();
            }
        }
    }

    render() {
        return html`
            <auth-card heading="Welcome back" subtitle="Log in to see today's exercises.">
                <form @submit=${this._login}>
                    ${this.errorMessage ? html`
                        <sl-alert variant="danger" open>
                            <sl-icon slot="icon" name="exclamation-octagon"></sl-icon>
                            ${this.errorMessage}
                        </sl-alert>` : ""}
                    <sl-input name="username" label="Username" autocomplete="username" required autofocus></sl-input>
                    <sl-input ${ref(this.passwordRef)} name="password" type="password" label="Password"
                              autocomplete="current-password" required password-toggle></sl-input>
                    <sl-button type="submit" variant="primary" size="large" ?loading="${this.loading}">Log in</sl-button>
                </form>
                <span slot="footer">No account yet? Ask a friend for an invite link.</span>
            </auth-card>
        `;
    }
}
