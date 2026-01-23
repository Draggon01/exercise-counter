import {customElement, state} from 'lit/decorators.js';
import {css, html} from 'lit';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import {store} from "../../store";
import {logoutUser, selectCurrentUser} from "../login/slice/userSlice";
import {ConnectedLitElement} from "../../connectedLitElement";
import {UserDto} from "../login/models/userDto";
import {CustomRouter} from "../../index";

@customElement('overlay-view')
export class OverlayView extends ConnectedLitElement {
    static styles = css`
        :host {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            font-family: Open Sans, sans-serif;
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

        .sizeing {
            --size: 1.8rem;
        }

        .scroller {
            max-height: calc(100vh - 48px);
            overflow: scroll;
            display: block;
        }
        
        .linkField{
            display: flex; 
            align-items: end
        }
        
        .linkField sl-input{
            width: 70%;
        }
    `;

    @state()
    private user?: UserDto;

    @state()
    private openLinkDialog?: boolean = false;

    @state()
    private inviteLink?: string;

    connectedCallback() {
        super.connectedCallback();
    }

    private async handleLogout() {
        await store.dispatch(logoutUser());
        void CustomRouter.goto("/");
    }

    stateChanged(state: any) {
        this.user = selectCurrentUser(state);
    }

    protected render() {
        return html`
            <header>
                <h3>Exercise Counter</h3>
                <div style="color:black;">
                    <sl-dropdown>
                        <div slot="trigger">
                            <sl-avatar class="sizeing" label="User avatar"></sl-avatar>
                            ${" " + this.user?.username + " ▾"}
                        </div>
                        <sl-menu>
                            <sl-menu-item @click="${() => {
                                void CustomRouter.goto("/groups");
                            }}"> Groups
                            </sl-menu-item>
                            <sl-menu-item @click="${async () => {
                                await fetch("/api/user/getInviteLink", {
                                    method: 'POST',
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: window.location.host,
                                    credentials: "include"
                                }).then(res => res.text()).then(res => this.inviteLink = res);
                                this.openLinkDialog = true;
                            }}"> Get invite link
                            </sl-menu-item>
                            <sl-menu-item @click=${this.handleLogout}> Logout
                                <sl-icon-button slot="suffix" style="margin-right: 0" name="box-arrow-right"
                                                label="Logout"
                                ></sl-icon-button>
                            </sl-menu-item>
                        </sl-menu>
                    </sl-dropdown>
                </div>
            </header>
            <main class="scroller">
                <slot name="main"></slot>
            </main>
            <sl-dialog .open=${this.openLinkDialog}
                       @sl-hide=${() => {
                           this.openLinkDialog = false;
                       }}
                       label="Your invite link is:"
            >
                <div class="linkField">
                    <sl-input readonly
                              .value=${this.inviteLink}>
                    </sl-input>
                    <sl-button slot="suffix" variant="neutral" size="medium" @click=${async () => {
                        if (this.inviteLink) {
                            await navigator.clipboard.writeText(this.inviteLink);
                        }
                    }}>
                        <sl-icon name="clipboard"></sl-icon>
                    </sl-button>
                </div>

                <p>it works for one invite and is valid for an uncertain time</p>
            </sl-dialog>
        `;
    }
}