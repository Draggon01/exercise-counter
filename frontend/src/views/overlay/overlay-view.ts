import {customElement} from 'lit/decorators.js';
import {css, html, LitElement} from 'lit';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import {store} from "../../store";
import {logoutUser} from "../login/slice/userSlice";

@customElement('overlay-view')
export class OverlayView extends LitElement {
    static styles = css`
        :host {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }

        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            background: var(--sl-color-primary-600);
            color: white;
            height: 1rem;
        }

        main {
            flex: 1;
            overflow: auto;
        }
    `;

    private async handleLogout() {
        await store.dispatch(logoutUser());
        //TODO: redirect to login page
    }

    protected render() {
        return html`
            <header>
                <h3>Exercise Counter</h3>
                <sl-icon-button name="box-arrow-right" label="Logout" @click=${this.handleLogout}></sl-icon-button>
            </header>
            <main>
                <slot name="main"></slot>
            </main>
        `;
    }
}