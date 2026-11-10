import {customElement, state} from "lit/decorators.js";
import {css, html, LitElement} from "lit";
import {Router} from "@lit-labs/router";
import {routes} from "./routes";
import './views/login/login-view'
import './views/overlay/overlay-view'
import './views/register/register-view'
import {RootState, store} from "./store";
import {readUserInfo, selectCurrentUser, selectUserInit} from "./views/login/slice/userSlice";
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
            font-size: 2rem;
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

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(readUserInfo())
    }

    stateChanged(state: RootState): void {
        this.user = selectCurrentUser(state);
        this.init = selectUserInit(state);
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
                <div class="starting" role="status" aria-label="Loading">
                    <sl-spinner></sl-spinner>
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


