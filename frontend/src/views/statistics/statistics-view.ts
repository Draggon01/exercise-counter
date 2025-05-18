import {css, html, PropertyValues} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from "../../store";
import {StatisticDto} from "./models/statisticDto";
import {loadStatistic, selectStatistic} from "./slice/statisticSlice";
import {CustomRouter} from "../../index";
import {createRef, Ref, ref} from "lit/directives/ref.js";
import {Chart} from "chart.js/auto";

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

    @state()
    statisticCanvas: Ref<HTMLCanvasElement> = createRef();

    chart: any;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(loadStatistic(this.exerciseId));
    }

    stateChanged(state: RootState) {
        this.statistic = selectStatistic(state);
    }

    protected updated(_changedProperties: PropertyValues) {
        super.updated(_changedProperties);
        if (this.statisticCanvas.value) {
            this.createGraph();
        }
    }

    private createGraph() {
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(
            this.statisticCanvas.value!,
            {
                type: 'bar',
                data: this.generateData(),
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: 'Chart.js Bar Chart - Stacked'
                        },
                    },
                    responsive: true,
                    scales: {
                        x: {
                            stacked: true,
                        },
                        y: {
                            stacked: true
                        }
                    }
                }
            }
        );
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
        if (this.statistic.finishedInformation === undefined) {
            return html`
                <h3>No Statistics Loaded</h3>
            `
        }
        return html`

            <div style="width: 800px">
                <canvas id="statistic" ${ref(this.statisticCanvas)}></canvas>
            </div>

            ${
                    Object.entries(this.statistic.finishedInformation).sort(([key1, _], [key2, __]) => {
                        return key1.localeCompare(key2);
                    }).map(([key, value]: [string, string[]]) => {
                        return html`
                            <div class="statisticItem">
                                <h3 style="margin: 0">${this.statisticKeyDateResolver(key)} → </h3>
                                ${value.map(item => html`${item} `)}
                            </div>
                        `
                    })

            }
        `;
    }

    private statisticKeyDateResolver(key: string) {
        let strings = key.split(":");
        if (strings[0] === strings[1]) {
            return strings[0];
        } else {
            return key;
        }
    }

    private generateData() {
        let sortedInfo = Object.entries(this.statistic.finishedInformation).sort(([key1, _], [key2, __]) => {
            return key1.localeCompare(key2);
        });

        let userDataSets: Record<string, (number | null)[]> = {};
        let labels = sortedInfo.map(([key, finishers]: [string, string[]]) => {
            finishers.forEach(user => {
                if (userDataSets[user] === undefined) {
                    userDataSets[user] = [];
                }
            });
            return this.statisticKeyDateResolver(key);
        })
        let users = Object.keys(userDataSets);

        sortedInfo.forEach(([_, finishers]: [string, string[]]) => {
            users.forEach(user => {
                finishers.includes(user) ? userDataSets[user].push(1) : userDataSets[user].push(null);
            })
        })


        let map = Object.entries(userDataSets)
            .map(([key, value]: [string, (number | null)[]]) => {
            return {
                label: key,
                data: value,
                backgroundColor: this.randomColor()
            }
        });


        return {
            labels: labels,
            datasets: map
        };
    }

    private randomColor() {
        return "rgb(" + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + ")";
    }
}