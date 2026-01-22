import {css, html, LitElement} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {CustomRouter} from "../../index";
import {store} from "../../store";
import {registerUser} from "../login/slice/userSlice";
import {RegisterDto} from "./model/registerDto";
import {navigate} from "../../lit-router";

@customElement('register-view')
export class RegisterView extends LitElement {

    @property()
    registerId?: string;

    @state()
    private errorMessage = "";

    private async userExists(username: string | undefined): Promise<boolean> {
        if(!username || username === ""){
            return false;
        }

        const res = await fetch("/api/public/checkUser", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: username,
            credentials: "include"
        });

        return res.json();
    }

    private async _register(event: SubmitEvent) {
        event.preventDefault();
        let target = event.target as HTMLFormElement;
        const formData = new FormData(target);

        if (!(await this.userExists(formData.get("username")?.toString()))) {
            this.errorMessage = "Username already exists or is not valid, try another one"
            return;
        }

        if (formData.get("password1")!.toString() !== formData.get("password2")!.toString()) {
            this.errorMessage = "Passwords do not match";
            return;
        }

        await store.dispatch(registerUser({
            username: formData.get("username")!.toString(),
            password: formData.get("password1")!.toString(),
            registerId: this.registerId //uuid from invite link
        } as RegisterDto));

        target.reset();
        navigate("/");
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

        .register-container {
            width: 100%;
            max-width: 400px;
            padding: 1rem;
        }

        .register-form {
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
            font-size: 1.75rem;
        }

        form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        sl-input {
            font-size: 1.125rem;
        }

        sl-button {
            width: 100%;
            margin-top: 0.5rem;
            font-size: 1.125rem;
            padding: 0.75rem;
        }

        .error-message {
            text-align: center;
            padding-top: 1rem;
            color: var(--sl-color-danger-600);
            font-weight: var(--sl-font-weight-semibold);
            font-size: 1rem;
        }

        @media (max-width: 480px) {
            .register-container {
                max-width: none;
            }

            .register-form {
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

            h2 {
                font-size: 2rem;
            }

            sl-input {
                font-size: 1.25rem;
            }

            sl-button {
                font-size: 1.25rem;
                padding: 1rem;
            }
        }
    `;

    render() {
        return html`
            <div class="register-container">
                <div class="register-form">
                    <h2>Register</h2>
                    <form @submit=${this._register}>
                        <sl-input name="username" label="Username" help-text="Enter your username" required clearable></sl-input>
                        <sl-input name="password1" type="password" label="Password" help-text="Enter your password" required password-toggle></sl-input>
                        <sl-input name="password2" type="password" label="Confirm Password" help-text="Re-enter your password" required password-toggle></sl-input>
                        <sl-button type="submit" variant="primary" size="large">Register</sl-button>
                    </form>
                </div>
                ${this.errorMessage ? html`<div class="error-message">${this.errorMessage}</div>` : ''}
            </div>
        `;
    }
}