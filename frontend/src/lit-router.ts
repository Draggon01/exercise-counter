import {customElement, state} from "lit/decorators.js";
import {html, LitElement} from "lit";
import {Router} from "@lit-labs/router";
import {routes} from "./routes";
import './views/login/login-view'
import './views/overlay/overlay-view'
import './views/register/register-view'
import {RootState, store} from "./store";
import {readUserInfo, selectCurrentUser, selectUserInit} from "./views/login/slice/userSlice";
import {ConnectedLitElement} from "./connectedLitElement";
import {UserDto} from "./views/login/models/userDto";

@customElement('lit-router')
export class LitRouter extends ConnectedLitElement {

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
            void this.router.goto("/");
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
                if (window.location.pathname.includes("register")) {
                    return false;
                }
                if (this.user && !this.user.anonymous) {
                    return true;
                }
                void this.router.goto("/login");
                return false;
            }
        },
    ]);


    render() {
        if (!this.init) {
            return html`
                <div style="padding: 5px">Restarting...</div>`;
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

/** @deprecated import from "./utils/navigation" – kept so existing imports keep working */
export {navigate} from "./utils/navigation";