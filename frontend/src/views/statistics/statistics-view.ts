import {css, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from "../../store";
import {StatisticDto} from "./models/statisticDto";
import {loadStatistic, selectStatistic} from "./slice/statisticSlice";
import {CustomRouter} from "../../index";

@customElement('statistics-view')
export class StatisticsView extends ConnectedLitElement {
    static styles = css`
        :host {
            display: block;
            padding: 1rem;
        }

        .header {
            display: flex;
            align-items: center;
            gap: 20px;
            grid-template-columns: auto auto;
        }
        
        .statisticItem {
            display: flex;
            align-items: center;
            gap: 5px;
        }
    `;

    @property()
    exerciseId: string = "";

    @state()
    statistic: StatisticDto = {} as StatisticDto;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(loadStatistic(this.exerciseId));
    }

    stateChanged(state: RootState) {
        this.statistic = selectStatistic(state);
    }

    render() {
        return html`
            <div>
                <div class="header">
                    <sl-button
                            @click="${() => {
                                void CustomRouter.goto(`/`);
                            }}"
                            variant="primary"
                    >Back
                    </sl-button>
                    <h2>Statistics</h2>
                </div>
                ${this.showStatistics()}
            </div>
        `;
    }

    private showStatistics() {
        if(this.statistic.finishedInformation === undefined) {
            return html`
                    <h3>No Statistics Loaded</h3>
            `
        }
        return html`
            ${
                    Object.entries(this.statistic.finishedInformation).map(([key, value] :[string, string[]]) => {
                        return html`
                            <div class="statisticItem">
                                <h3>${key}</h3>
                                ${value.map(item => html`${item}`)}
                            </div>
                        `
                    })

            }
        `;
    }
}