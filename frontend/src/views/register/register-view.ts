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
        console.log(username)
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

        console.log("register");
        await store.dispatch(registerUser({
            username: formData.get("username")!.toString(),
            password: formData.get("password1")!.toString(),
            registerId: this.registerId //uuid from invite link
        } as RegisterDto));

        target.reset();
        navigate("/");
        //void CustomRouter.goto("/");
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

        .register-form {
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            background: white;
        }
    `;

    render() {
        return html`
            <div>
                <div class="register-form">
                    <h2>Register</h2>
                    <form @submit=${this._register}>
                        <sl-input name="username" label="Username" required></sl-input>
                        <sl-input name="password1" type="password" label="Password" required></sl-input>
                        <sl-input name="password2" type="password" label="Password" required></sl-input>
                        <sl-button type="submit" variant="primary">Log in</sl-button>
                    </form>
                </div>
                <div style="text-align: center; padding-top: 8px; color: red">${this.errorMessage}</div>
            </div>
        `;
    }
}