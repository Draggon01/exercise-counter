import {RouteConfig} from "@lit-labs/router";
import {html} from "lit";

import "./views/home/home-view"
import {navigate} from "./lit-router";

export const routes: RouteConfig[] = [
    {
        path: '/',
        render: () => html`
            <home-view></home-view>`
    },
    {path: '/projects', render: () => html`<h1>Projects</h1>`},
    {path: '/about', render: () => html`<h1>About</h1>`},
    {
        path: '*',
        render: () => html``,
        enter: () => {
            console.log("sadf");
            navigate("/");
            return false;
        }
    }
];
