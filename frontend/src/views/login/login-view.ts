import {css, html, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {store} from "../../store";
import {saveUserInfo} from "./slice/userSlice";
import {CustomRouter} from "../../index";

@customElement('login-view')
export class LoginView extends LitElement {

    @state()
    private errorMessage = "";

    private async _login(event: SubmitEvent) {
        event.preventDefault();
        const formData = new FormData(event.target as HTMLFormElement);
        let urlSearchParams = new URLSearchParams();
        urlSearchParams.append("username", formData.get("username")!.toString());
        urlSearchParams.append("password", formData.get("password")!.toString());
        (event.target as HTMLFormElement).reset();
        await store.dispatch(saveUserInfo(urlSearchParams));
        void CustomRouter.goto("/");
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
            background-color: var(--sl-color-neutral-50);
            font-family: Open Sans, sans-serif;
        }
        .login-container {
            width: 100%;
            max-width: 400px;
            padding: 1rem;
        }

        .login-form {
            padding: 2rem;
            border-radius: var(--sl-border-radius-medium);
            box-shadow: var(--sl-shadow-medium);
            background: white;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        h2 {
            margin: 0 0 0.5rem 0;
            text-align: center;
            color: var(--sl-color-neutral-900);
        }

        form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        sl-button {
            width: 100%;
            margin-top: 0.5rem;
        }

        .error-message {
            text-align: center;
            padding-top: 1rem;
            color: var(--sl-color-danger-600);
            font-weight: var(--sl-font-weight-semibold);
        }

        @media (max-width: 480px) {
            .login-container {
                max-width: none;
            }

            .login-form {
                padding: 1.5rem;
                box-shadow: none;
                border-radius: 0;
                background: transparent;
            }

            :host {
                background-color: white;
                align-items: flex-start;
                padding-top: 10vh;
            }
        }
    `;

    render() {
        return html`
            <div class="login-container">
                <div class="login-form">
                    <h2>Login</h2>
                    <form @submit=${this._login}>
                        <sl-input name="username" label="Username" help-text="Enter your username" required clearable></sl-input>
                        <sl-input name="password" type="password" label="Password" help-text="Enter your password" required password-toggle></sl-input>
                        <sl-button type="submit" variant="primary" size="large">Log in</sl-button>
                    </form>
                </div>
                ${this.errorMessage ? html`<div class="error-message">${this.errorMessage}</div>` : ''}
            </div>
        `;
    }
}