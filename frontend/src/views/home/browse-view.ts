import {css, html} from 'lit';
import {onAppRefresh} from "../../utils/refresh";
import {pageStyles} from "../../styles/page";
import "../../components/page-header";
import "../../components/empty-state";
import {toast} from "../../components/toast";
import {loadOptions, selectNewExerciseView, selectOptionsReady} from "../options/slice/optionsSlice";
import {navigate, withBack} from "../../utils/navigation";
import {AsyncStoreState} from "../../commons";
import {customElement, state} from 'lit/decorators.js';
import './elements/browse-card'
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {listExercisesAvailable, selectAvailableExercises, selectAvailableStatus, selectExercise} from "./slice/exerciseSlice";
import {ExerciseDto} from "./models/exerciseDto";
import {matchesSearch} from "../../utils/search";
import type {SlInput} from "@shoelace-style/shoelace";

@customElement('browse-view')
export class BrowseView extends ConnectedLitElement {

    @state()
    private browseExercises: ExerciseDto[] = [];

    @state()
    private status: AsyncStoreState = "initial";

    @state()
    private newExerciseView = false;

    /** Filters the loaded list by name (only in the browser). */
    @state()
    private search = "";

    static styles = [pageStyles, css`
        .browse-list {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-3);
        }

        .search {
            margin-bottom: var(--app-space-4);
        }

        .skeleton {
            --border-radius: var(--app-radius);
            height: 72px;
        }


    `];

    private stopRefresh?: () => void;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(listExercisesAvailable());
        if (!selectOptionsReady(store.getState())) store.dispatch(loadOptions());
        this.stopRefresh = onAppRefresh(() => store.dispatch(listExercisesAvailable()));
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.stopRefresh?.();
    }

    stateChanged(state: RootState): void {
        this.browseExercises = selectAvailableExercises(state);
        this.status = selectAvailableStatus(state);
        this.newExerciseView = selectNewExerciseView(state);
    }

    protected render() {
        return html`
            <div class="page-container">
                <page-header heading="Browse Exercises"></page-header>
                <sl-input class="search" type="search" placeholder="Search by name" clearable
                          aria-label="Search exercises by name" enterkeyhint="search" .value="${this.search}"
                          @sl-input="${(e: Event) => this.search = (e.target as SlInput).value}"
                          @sl-clear="${() => this.search = ""}">
                    <sl-icon slot="prefix" name="search"></sl-icon>
                </sl-input>
                <div class="browse-list">${this.renderList()}</div>
            </div>
        `;
    }

    private renderList() {
        if (this.status === "initial" || this.status === "loading") {
            return [1, 2, 3].map(() => html`<sl-skeleton effect="pulse" class="skeleton"></sl-skeleton>`);
        }
        if (this.status === "error") {
            return html`
                <empty-state icon="cloud-slash" heading="Could not load exercises">
                    <sl-button @click="${() => store.dispatch(listExercisesAvailable())}">Try again</sl-button>
                </empty-state>`;
        }
        if (this.browseExercises.length === 0) {
            return html`
                <empty-state icon="search" heading="Nothing new to browse"
                             text="All exercises you can see are already on your list. Public exercises and exercises shared with your groups show up here.">
                    <sl-button @click="${() => navigate("/")}">Back to my exercises</sl-button>
                </empty-state>`;
        }
        const found = this.browseExercises.filter(exercise => matchesSearch(exercise.exerciseTitle, this.search));
        if (found.length === 0) {
            return html`
                <empty-state icon="search" heading="No exercise found"
                             text="No exercise name contains “${this.search.trim()}”.">
                    <sl-button @click="${() => this.search = ""}">Clear search</sl-button>
                </empty-state>`;
        }
        return found.map(exercise => html`
            <browse-card .item="${exercise}" ?canOpen="${this.newExerciseView}"
                         @open-exercise="${(e: CustomEvent<ExerciseDto>) => navigate(withBack(`/exercises/${e.detail.exerciseId}`, "/browse"))}"
                         @select-exercise="${this.handleExerciseSelect}"></browse-card>
        `);
    }

    private handleExerciseSelect = async (event: CustomEvent<ExerciseDto>) => {
        const result = await store.dispatch(selectExercise(event.detail.exerciseId));
        if (selectExercise.fulfilled.match(result)) {
            toast(`"${event.detail.exerciseTitle}" added to your list`, "success");
        }
    }

}