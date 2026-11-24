import {RouteConfig} from "@lit-labs/router";
import {html} from "lit";

import "./views/home/home-view"
import "./views/statistics/statistics-view"
import "./views/groups/groups-view"
import "./views/home/browse-view"
import "./views/options/options-view"
import "./views/exercise/exercise-view"
import "./views/exercise/exercise-content-view"
import "./views/exercise-edit/exercise-edit-view"
import {isPublicPage, navigate} from "./utils/navigation";

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
      path: '/groups', render: () => html`
            <groups-view></groups-view>`
    },
    {
      path: '/browse', render: () => html`
            <browse-view></browse-view>`
    },
    {
        // one route (optional tab), so switching tabs keeps the same element
        path: '/options/:tab?', render: (params) => html`
            <options-view .tab="${params["tab"] ?? ""}"></options-view>`
    },
    {
        path: '/exercises/new', render: () => html`
            <exercise-edit-view></exercise-edit-view>`
    },
    {
        path: '/exercises/:id/edit', render: (params) => html`
            <exercise-edit-view .exerciseId="${params["id"]}"></exercise-edit-view>`
    },
    {
        path: '/exercises/:id/content', render: (params) => html`
            <exercise-content-view .exerciseId="${params["id"]}"></exercise-content-view>`
    },
    {
        // after /exercises/new
        path: '/exercises/:id', render: (params) => html`
            <exercise-view .exerciseId="${params["id"]}"></exercise-view>`
    },
    {
        path: '*',
        render: () => html``,
        enter: () => {
            // leaving the app shell (logout): the outer router (lit-router.ts) shows these pages. Navigating home
            // from here would be sent back to /login, endlessly
            if (!isPublicPage(window.location.pathname)) navigate("/");
            return false;
        }
    }
];