import {customElement, state} from 'lit/decorators.js';
import {css, html, LitElement} from 'lit';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import {store} from "../../store";
import {logoutUser, selectCurrentUser} from "../login/slice/userSlice";
import {ConnectedLitElement} from "../../connectedLitElement";
import {UserDto} from "../login/models/userDto";

@customElement('overlay-view')
export class OverlayView extends ConnectedLitElement {
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

    @state()
    private user?: UserDto;

    connectedCallback() {
        super.connectedCallback();
    }

    private async handleLogout() {
        await store.dispatch(logoutUser());
    }

    stateChanged(state: any) {
        this.user = selectCurrentUser(state);
    }

    protected render() {
        return html`
            <header>
                <h3>Exercise Counter</h3>
                <div style="color:black">
                    ${this.user?.username}
                    <sl-icon-button name="box-arrow-right" label="Logout" @click=${this.handleLogout}></sl-icon-button>
                </div>
            </header>
            <main>
                <slot name="main"></slot>
            </main>
        `;
    }
}