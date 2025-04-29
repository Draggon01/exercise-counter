import {css, html, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {store} from "../../store";
import {saveUserInfo} from "./slice/userSlice";

@customElement('login-view')
export class LoginView extends LitElement {

    @state()
    private errorMessage = "";

    private triedLogin = false;

    private async _login(event: SubmitEvent) {
        event.preventDefault();
        const formData = new FormData(event.target as HTMLFormElement);
        let urlSearchParams = new URLSearchParams();
        urlSearchParams.append("username", formData.get("username")!.toString());
        urlSearchParams.append("password", formData.get("password")!.toString());
        this.triedLogin = true;
        (event.target as HTMLFormElement).reset();
        await store.dispatch(saveUserInfo(urlSearchParams));
        this.errorMessage = "Wrong Username or Password";
    }

    static styles = css`
        :host {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .login-form {
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            background: white;
        }
    `;

    render() {
        return html`
            <div>
                <div class="login-form">
                    <h2>Login</h2>
                    <form @submit=${this._login}>
                        <sl-input name="username" label="Username" required></sl-input>
                        <sl-input name="password" type="password" label="Password" required></sl-input>
                        <sl-button type="submit" variant="primary">Log in</sl-button>
                    </form>
                </div>
                <div style="text-align: center; padding-top: 8px; color: red">${this.errorMessage}</div>
            </div>
        `;
    }
}