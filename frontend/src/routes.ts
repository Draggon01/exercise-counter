import {RouteConfig} from "@lit-labs/router";
import {html} from "lit";

import "./views/home/home-view"
import "./views/statistics/statistics-view"
import {navigate} from "./lit-router";

export const routes: RouteConfig[] = [
    {
        path: '/',
        render: () => html`
            <home-view></home-view>`
    },
    {
        path: '/statistics/:id', render: (elements) => html`
            <statistics-view
                    .exerciseId="${elements["id"]}"
            ></statistics-view>`
    },
    {
        path: '*',
        render: () => html``,
        enter: () => {
            navigate("/");
            return false;
        }
    }
];
