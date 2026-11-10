import {css, html} from 'lit';
import {pageStyles} from "../../styles/page";
import "../../components/page-header";
import "../../components/empty-state";
import {toast} from "../../components/toast";
import {navigate} from "../../utils/navigation";
import {AsyncStoreState} from "../../commons";
import {customElement, state} from 'lit/decorators.js';
import './elements/browse-card'
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {listExercisesAvailable, selectAvailableExercises, selectAvailableStatus, selectExercise} from "./slice/exerciseSlice";
import {ExerciseDto} from "./models/exerciseDto";

@customElement('browse-view')
export class BrowseView extends ConnectedLitElement {

    @state()
    private browseExercises: ExerciseDto[] = [];

    @state()
    private status: AsyncStoreState = "initial";

    static styles = [pageStyles, css`
        .browse-list {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-3);
        }

        .skeleton {
            --border-radius: var(--app-radius);
            height: 72px;
        }


    `];

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(listExercisesAvailable())
    }

    stateChanged(state: RootState): void {
        this.browseExercises = selectAvailableExercises(state);
        this.status = selectAvailableStatus(state);
    }

    protected render() {
        return html`
            <div class="page-container">
                <page-header heading="Browse Exercises"></page-header>
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
        return this.browseExercises.map(exercise => html`
            <browse-card .item="${exercise}" @select-exercise="${this.handleExerciseSelect}"></browse-card>
        `);
    }

    private handleExerciseSelect = async (event: CustomEvent<ExerciseDto>) => {
        const result = await store.dispatch(selectExercise(event.detail.exerciseId));
        if (selectExercise.fulfilled.match(result)) {
            toast(`"${event.detail.exerciseTitle}" added to your list`, "success");
        }
    }

}