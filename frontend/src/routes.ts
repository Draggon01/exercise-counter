import {RouteConfig} from "@lit-labs/router";
import {html} from "lit";

import "./views/home/home-view"
import "./views/statistics/statistics-view"
import "./views/groups/groups-view"
import "./views/home/browse-view"
import "./views/options/options-view"
import "./views/exercise-edit/exercise-edit-view"
import {navigate} from "./utils/navigation";

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
      path: '/options', render: () => html`
            <options-view></options-view>`
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
        path: '*',
        render: () => html``,
        enter: () => {
            navigate("/");
            return false;
        }
    }
];