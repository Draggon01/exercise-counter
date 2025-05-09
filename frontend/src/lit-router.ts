import {customElement, state} from "lit/decorators.js";
import {html, LitElement} from "lit";
import {Router} from "@lit-labs/router";
import {routes} from "./routes";
import './views/login/login-view'
import './views/overlay/overlay-view'
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
            path: 'login',
            render: () => html`
                <login-view></login-view>`
        },
        {
            path: '*',
            render: () => html`
                <overlay-view>
                    <children-routes slot="main"></children-routes>
                </overlay-view>



            `,
            enter: (_) => {
                console.log("try enter normal");
                console.log(this.user)
                if (this.user && !this.user.anonymous) {
                    return true;
                }
                void this.router.goto("login");
                return false;
            }
        },
    ]);


    render() {
        if (!this.init) {
            return html`
                <div>Loading...</div>`;
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

export function navigate(path: string) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
}