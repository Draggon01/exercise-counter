import {css, html} from 'lit';
import "../../components/page-header";
import {customElement, state} from 'lit/decorators.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import './elements/browse-card'
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {listExercisesAvailable, selectAllExercises, selectExercise} from "./slice/exerciseSlice";
import {ExerciseDto} from "./models/exerciseDto";

@customElement('browse-view')
export class BrowseView extends ConnectedLitElement {

    @state()
    private browseExercises: ExerciseDto[] = [];

    private idx = 0;

    static styles = css`
        :host {
            display: block;
            padding: 1rem;
        }

        .content-body {
            position: relative;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            overflow-y: auto;
            height: 100%;
        }
    `

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(listExercisesAvailable())
    }

    stateChanged(state: RootState): void {
        if(state.exercise.exercises.status === "idle" && this.idx != 0){
            this.browseExercises = selectAllExercises(state);
        }
        this.idx++;
    }

    protected render() {
        return html`
            <div class="content">
                <page-header heading="Browse Exercises"></page-header>
                <div class="content-body">
                    <!-- Content goes here -->
                    ${!this.browseExercises || this.browseExercises.length == 0 ? "no Exercises to Browse!" : ''}
                    ${this.browseExercises.map(ex => html`
                        <browse-card
                                .item="${ex}"
                                @select-exercise="${this.handleExerciseSelect}"
                        ></browse-card>
                    `)}
                </div>
            </div>
        `;
    }

    private handleExerciseSelect = (event: CustomEvent<ExerciseDto>) => {
        store.dispatch(selectExercise(event.detail.exerciseId));
    }

}