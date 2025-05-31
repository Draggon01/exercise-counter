import {css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import './elements/browse-card'
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {CustomRouter} from "../../index";
import {listExercisesAvailable, selectAllExercises, selectExercise} from "./slice/exerciseSlice";
import {ExerciseDto} from "./models/exerciseDto";

@customElement('browse-view')
export class BrowseView extends ConnectedLitElement {

    @state()
    private browseExercises: ExerciseDto[] = [];

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
        this.browseExercises = selectAllExercises(state);
    }

    protected render() {
        return html`
            <div class="content">
                <div class="toolbar">
                    <sl-button
                            @click="${() => {
                                void CustomRouter.goto(`/`);
                            }}"
                            variant="primary">
                        Back
                    </sl-button>
                </div>
                <div class="content-body">
                    <!-- Content goes here -->
                    ${!this.browseExercises || this.browseExercises.length == 0 ? "no Exercises to Browse!" : ''}
                    ${this.browseExercises.map(ex => html`
                        <browse-card
                                .item="${ex}"
                                @selectClick="${(e: any) => this.handleExerciseSelect(e)}"
                        ></browse-card>
                    `)}
                </div>
            </div>
        `;
    }

    private handleExerciseSelect(event: any) {
        if (event.detail) {
            store.dispatch(selectExercise((event.detail as ExerciseDto).exerciseId))
        }
    }

}