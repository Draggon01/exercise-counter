import {customElement, state} from "lit/decorators.js";
import {css, html, LitElement} from "lit";
import {Router} from "@lit-labs/router";
import {routes} from "./routes";
import './views/login/login-view'
import './views/overlay/overlay-view'
import './views/register/register-view'
import {RootState, store} from "./store";
import {readUserInfo, selectCurrentUser, selectUserInit, selectUserStatus} from "./views/login/slice/userSlice";
import "./components/empty-state";
import {ConnectedLitElement} from "./connectedLitElement";
import {navigate} from "./utils/navigation";
import {UserDto} from "./views/login/models/userDto";

@customElement('lit-router')
export class LitRouter extends ConnectedLitElement {

    static styles = css`
        .starting {
            display: grid;
            place-items: center;
            height: 100vh;
            height: 100dvh;
            padding: var(--app-space-4);
            box-sizing: border-box;
            font-size: 2rem;
        }

        .starting empty-state {
            width: 100%;
            max-width: 420px;
            font-size: 1rem;
        }
    `;

    private user: UserDto = {
        username: "",
        anonymous: true
    }

    @state()
    init: boolean = false;

    @state()
    once: boolean = true;

    /** Loading the user info failed (e.g. offline): show a retry instead of an endless spinner. */
    @state()
    private startFailed = false;

    /** Back online while the start failed: try again automatically. */
    private onOnline = () => {
        if (!this.init) store.dispatch(readUserInfo());
    }

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(readUserInfo());
        window.addEventListener("online", this.onOnline);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("online", this.onOnline);
    }

    stateChanged(state: RootState): void {
        this.user = selectCurrentUser(state);
        this.init = selectUserInit(state);
        this.startFailed = !this.init && selectUserStatus(state) === "error";
        if (this.init && this.once) {
            // the user info is known now: route the current URL (keeps deep links like /groups)
            void this.router.goto(window.location.pathname);
            this.once = false;
        }
    }

    public router = new Router(this, [
        {
            path: '/login',
            render: () => html`
                <login-view></login-view>`
        },
        {
            path: '/register/:id',
            render: (params) => html`
                <register-view .registerId="${params["id"]}"></register-view>
            `,
            // the invite link is validated by register-view itself (via registerSlice)
        },
        {
            path: '*',
            render: () => html`
                <overlay-view>
                    <children-routes slot="main"></children-routes>
                </overlay-view>
            `,
            enter: (_) => {
                if (!this.init) {
                    // user info not loaded yet: stateChanged routes the URL again once it is
                    return false;
                }
                if (window.location.pathname.includes("register")) {
                    return false;
                }
                if (this.user && !this.user.anonymous) {
                    return true;
                }
                navigate("/login");
                return false;
            }
        },
    ]);


    render() {
        if (!this.init) {
            return html`
                <div class="starting" role="status" aria-label="${this.startFailed ? "Server not reachable" : "Loading"}">
                    ${this.startFailed ? html`
                        <empty-state icon="wifi-off" heading="Server not reachable"
                                     text="Check your internet connection. The app retries automatically when you are back online.">
                            <sl-button variant="primary" @click="${() => store.dispatch(readUserInfo())}">Try again</sl-button>
                        </empty-state>
                    ` : html`<sl-spinner></sl-spinner>`}
                </div>`;
        }
        return this.router.outlet();
    }
}

@customElement('children-routes')
export class ChildrenRoutes extends LitElement {
    public routes = new Router(this, routes)

    protected render() {
        return this.routes.outlet();
    }
}


