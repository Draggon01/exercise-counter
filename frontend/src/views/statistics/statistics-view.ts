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
            flex-wrap: wrap;
            align-items: baseline;
            gap: 5px;
            margin-bottom: 1rem;
        }

        .statisticItem h3 {
            margin: 0;
            flex-basis: auto;
            flex-shrink: 0;
        }

        .statisticItem .statisticText {
            flex: 1 1 auto;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }

        .chartContainer {
            width: 100%;
            max-width: 800px;
            height: auto;
            position: relative;
        }

        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                align-items: flex-start;
            }

            .chartContainer {
                max-width: 100%;
                aspect-ratio: 1 / 1.25;
                max-height: 600px;
            }
        }
    `;

    @property()
    exerciseId: string = "";

    @state()
    statistic: StatisticDto = {} as StatisticDto;

    @state()
    statisticCanvas: Ref<HTMLCanvasElement> = createRef();

    @state()
    showLastXEntries: number = -1;

    chart: any;

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(loadStatistic(this.exerciseId));
    }

    stateChanged(state: RootState) {
        this.statistic = selectStatistic(state);
        if (this.statistic && this.statistic.finishedInformation) {
            this.showLastXEntries = Object.keys(this.statistic.finishedInformation).length < 10 ?
                Object.keys(this.statistic.finishedInformation).length : 10;
        }
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
        const isMobile = window.innerWidth < 768;

        this.chart = new Chart(
            this.statisticCanvas.value!,
            {
                type: 'bar',
                data: this.generateData(),
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: 'Exercise Completions'
                        },
                        legend: {
                            position: isMobile ? 'bottom' : 'top',
                        }
                    },
                    responsive: true,
                    maintainAspectRatio: !isMobile,
                    scales: {
                        x: {
                            stacked: true,
                            ticks: {
                                maxRotation: isMobile ? 45 : 0,
                                minRotation: isMobile ? 45 : 0,
                            }
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
                <div>
                    <sl-input label="Show last x entries" min="0"
                              .max="${this.statistic && this.statistic.finishedInformation ? Object.keys(this.statistic.finishedInformation).length : 0}"
                              type="number"
                              .value="${this.showLastXEntries}"
                              @sl-change="${(e: any) => {
                                  if (e.target.value > Object.keys(this.statistic.finishedInformation).length) {
                                      this.showLastXEntries = Object.keys(this.statistic.finishedInformation).length;
                                      e.target.value = Object.keys(this.statistic.finishedInformation).length;
                                  } else if (e.target.value < 0) {
                                      this.showLastXEntries = 0;
                                      e.target.value = 0;
                                  }
                                  this.showLastXEntries = e.target.value;
                                  this.chart.data = this.generateData();
                                  this.chart.update();
                              }}"
                    ></sl-input>
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
        let finishedInformation = Object.entries(this.statistic.finishedInformation);
        return html`

            <div class="chartContainer">
                <canvas id="statistic" ${ref(this.statisticCanvas)}></canvas>
            </div>

            ${
                    finishedInformation.sort(([key1, _], [key2, __]) => {
                        return key1.localeCompare(key2);
                    })
                            .slice(finishedInformation.length - this.showLastXEntries, finishedInformation.length)
                            .map(([key, value]: [string, string[]]) => {
                                return html`
                                    <div class="statisticItem">
                                        <h3 style="margin: 0">${this.statisticKeyDateResolver(key)} → </h3>
                                        <div class="statisticText">${value.join(', ')}</div>
                                    </div>
                                `
                            })

            }
        `;
    }

    private statisticKeyDateResolver(key: string) {
        if (!key.includes(":")) {
            return key;
        }
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

        sortedInfo = sortedInfo.slice(sortedInfo.length - this.showLastXEntries, sortedInfo.length);

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
            .map(([key, value]: [string, (number | null)[]], index) => {
                return {
                    label: key,
                    data: value,
                    backgroundColor: this.colors[index % 8]
                }
            });


        return {
            labels: labels,
            datasets: map
        };
    }

    private colors: string[] = [
        "rgb(188, 182, 217)",
        "rgb(45, 59, 134)",
        "rgb(196, 232, 253)",
        "rgb(8, 132, 196)",
        "rgb(129, 207,251)",
        "rgb(87, 60, 145)",
        "rgb(184, 212, 249)",
        "rgb(7, 48, 74)"
    ]

    private randomColor() {
        return "rgb(" + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + "," + Math.floor(Math.random() * 255) + ")";
    }
}