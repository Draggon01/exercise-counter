import {css, html, nothing} from 'lit';
import {touchStyles} from "../../styles/touch";
import {customElement, property, state} from 'lit/decorators.js';
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from "../../store";
import {StatisticDto} from "./models/statisticDto";
import {loadStatistic, selectStatistic, selectStatisticStatus} from "./slice/statisticSlice";
import {selectAllExercises} from "../home/slice/exerciseSlice";
import {selectCurrentUser} from "../login/slice/userSlice";
import {AsyncStoreState} from "../../commons";
import {pageStyles} from "../../styles/page";
import {closedPeriods, CURRENT_PERIOD, participants, PeriodRow, summarize, UserSummary, visiblePeople} from "../../utils/statistics";
import "../../components/page-header";
import "../../components/empty-state";
import type {SlCheckbox, SlRadioGroup} from "@shoelace-style/shoelace";

type Range = "7" | "30" | "all";

/** Short column label, e.g. "9.11" for 2026-11-09. */
const dayLabel = (date: string) => {
    const [, month, day] = date.split("-");
    return month && day ? `${Number(day)}.${Number(month)}` : date;
};

/**
 * Statistics of one exercise: the current user's streaks and completion (KPI row), completion per
 * person (meter list) and who finished which period (grid; it is a real table, so it doubles as the
 * table view). Colors come from the --app-chart-* tokens (validated per light / dark mode).
 */
@customElement('statistics-view')
export class StatisticsView extends ConnectedLitElement {

    static styles = [pageStyles, touchStyles, css`
        section {
            margin-top: var(--app-space-5);
        }

        .filters + section {
            margin-top: var(--app-space-3);
        }

        h3 {
            margin: 0 0 var(--app-space-3);
            font-size: 1rem;
            color: var(--app-text);
        }

        .filters {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-2) var(--app-space-4);
        }

        /* label only for screen readers */
        .filters sl-radio-group::part(form-control-label) {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
        }

        /* ---- KPI row */
        .kpis {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: var(--app-space-3);
        }

        .tile {
            padding: var(--app-space-3) var(--app-space-4);
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius);
            background: var(--app-surface);
        }

        .tile-label {
            font-size: 0.85em;
            color: var(--app-text-muted);
        }

        .tile-value {
            margin-top: var(--app-space-1);
            font-size: 1.75rem;
            font-weight: 600;
            color: var(--app-text);
            font-variant-numeric: tabular-nums;
        }

        .tile-note {
            font-size: 0.8em;
            color: var(--app-text-subtle);
        }

        /* ---- meter list */
        .meters {
            display: grid;
            grid-template-columns: minmax(80px, max-content) 1fr auto;
            align-items: center;
            gap: var(--app-space-2) var(--app-space-3);
        }

        .meter-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .meter-name.me {
            font-weight: 600;
        }

        .meter {
            height: 8px;
            border-radius: var(--app-radius-pill);
            background: var(--app-chart-track);
            overflow: hidden;
        }

        .meter-fill {
            height: 100%;
            border-radius: var(--app-radius-pill);
            background: var(--app-chart-done);
        }

        .meter-figure {
            font-size: 0.9em;
            color: var(--app-text-muted);
            font-variant-numeric: tabular-nums;
            text-align: right;
        }

        /* ---- grid */
        .legend {
            display: flex;
            flex-wrap: wrap;
            gap: var(--app-space-4);
            margin-bottom: var(--app-space-3);
            font-size: 0.85em;
            color: var(--app-text-muted);
        }

        .legend span {
            display: inline-flex;
            align-items: center;
            gap: var(--app-space-2);
        }

        .scroller {
            overflow-x: auto;
            /* start at the newest (right) end without JavaScript */
            direction: rtl;
        }

        table {
            direction: ltr;
            /* left-aligned when it fits; when it overflows, rtl scrolling still starts at the newest end */
            margin-right: auto;
            border-collapse: separate;
            border-spacing: 2px;
        }

        th {
            font-weight: normal;
            font-size: 0.75em;
            color: var(--app-text-subtle);
            white-space: nowrap;
        }

        th[scope="row"] {
            position: sticky;
            left: 0;
            z-index: 1;
            padding-right: var(--app-space-2);
            background: var(--app-bg);
            text-align: left;
            font-size: 0.85em;
            color: var(--app-text);
            max-width: 110px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        th.now {
            color: var(--app-accent);
            font-weight: 600;
        }

        td {
            padding: 0;
        }

        /* 24px hit target, 18px mark */
        .cell {
            display: grid;
            place-items: center;
            width: 24px;
            height: 24px;
            padding: 0;
            border: none;
            background: none;
            cursor: default;
        }

        .mark {
            box-sizing: border-box;
            width: 18px;
            height: 18px;
            border-radius: 4px;
        }

        .mark.done {
            background: var(--app-chart-done);
        }

        .mark.missed {
            border: 1.5px solid var(--app-chart-empty-border);
        }

        .mark.open {
            border: 1.5px dashed var(--app-chart-empty-border);
        }

        .cell:hover .mark, .cell:focus-visible .mark {
            outline: 2px solid var(--app-text);
            outline-offset: 1px;
        }

        .tooltip {
            position: fixed;
            z-index: 10;
            pointer-events: none;
            padding: var(--app-space-2) var(--app-space-3);
            border-radius: var(--app-radius-sm);
            background: var(--sl-tooltip-background-color);
            color: var(--sl-tooltip-color);
            font-size: 0.85em;
            box-shadow: var(--app-shadow-raised);
            white-space: nowrap;
        }

        .tooltip strong {
            display: block;
        }

        .skeleton {
            --border-radius: var(--app-radius);
            height: 90px;
            margin-top: var(--app-space-3);
        }

        @media (max-width: 480px) {
            .kpis {
                gap: var(--app-space-2);
            }

            .tile {
                padding: var(--app-space-2) var(--app-space-3);
            }

            .tile-value {
                font-size: 1.4rem;
            }
        }
    `];

    /** From the route /statistics/:id. */
    @property()
    exerciseId: string = "";

    @state()
    private statistic: StatisticDto = {finishedInformation: {}};

    @state()
    private status: AsyncStoreState = "initial";

    @state()
    private exerciseTitle = "";

    @state()
    private me = "";

    @state()
    private range: Range = "30";

    /** Also show people who no longer have the exercise on their home page. */
    @state()
    private showEveryone = false;

    /** Tooltip of the hovered / focused grid cell. */
    @state()
    private tip?: { status: string, detail: string, x: number, y: number };

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(loadStatistic(this.exerciseId));
    }

    stateChanged(state: RootState) {
        this.statistic = selectStatistic(state);
        this.status = selectStatisticStatus(state);
        this.me = selectCurrentUser(state)?.username ?? "";
        this.exerciseTitle = selectAllExercises(state).find(e => e.exerciseId === this.exerciseId)?.exerciseTitle ?? "";
    }

    render() {
        return html`
            <div class="page-container">
                <page-header heading="${this.exerciseTitle || "Statistics"}" backTo="/"></page-header>
                ${this.renderContent()}
            </div>
            ${this.tip ? html`
                <div class="tooltip" role="tooltip" style="left: ${this.tip.x}px; top: ${this.tip.y}px">
                    <strong>${this.tip.status}</strong>${this.tip.detail}
                </div>` : nothing}
        `;
    }

    private renderContent() {
        if (this.status === "error") {
            return html`
                <empty-state icon="cloud-slash" heading="Could not load the statistics">
                    <sl-button @click="${() => store.dispatch(loadStatistic(this.exerciseId))}">Try again</sl-button>
                </empty-state>`;
        }
        if (this.status !== "idle") {
            return [1, 2, 3].map(() => html`<sl-skeleton effect="pulse" class="skeleton"></sl-skeleton>`);
        }
        const info = this.statistic.finishedInformation ?? {};
        const current = info[CURRENT_PERIOD] ?? [];
        const allPeriods = closedPeriods(info);
        if (allPeriods.length === 0) {
            return html`
                <empty-state icon="bar-chart" heading="No statistics yet"
                             text="Finished periods show up here after the first reset.
                                   ${current.length ? `Done so far in this period: ${current.join(", ")}.` : ""}">
                </empty-state>`;
        }
        const periods = this.range === "all" ? allPeriods : allPeriods.slice(-Number(this.range));
        const everyone = participants(info, this.me);
        const users = visiblePeople(everyone, this.statistic.participants, this.showEveryone, periods, current, this.me);
        // former participants who were active in the range – what the checkbox would add
        const hidden = visiblePeople(everyone, this.statistic.participants, true, periods, current, this.me).length
            - visiblePeople(everyone, this.statistic.participants, false, periods, current, this.me).length;
        const summaries = users.map(user => summarize(user, periods, current));
        const mine = summarize(this.me, periods, current);
        return html`
            <div class="filters">
                <sl-radio-group size="small" label="Time range" .value="${this.range}"
                                @sl-change="${(e: Event) => this.range = (e.target as SlRadioGroup).value as Range}">
                    <sl-radio-button value="7">7 periods</sl-radio-button>
                    <sl-radio-button value="30">30 periods</sl-radio-button>
                    <sl-radio-button value="all">All</sl-radio-button>
                </sl-radio-group>
                ${this.showEveryone || hidden > 0 ? html`
                    <sl-checkbox size="small" .checked="${this.showEveryone}"
                                 @sl-change="${(e: Event) => this.showEveryone = (e.target as SlCheckbox).checked}">
                        Show former participants${hidden > 0 ? ` (${hidden})` : ""}
                    </sl-checkbox>` : nothing}
            </div>
            ${this.renderKpis(mine)}
            <section>
                <h3>Completion by person</h3>
                <div class="meters">${[...summaries].sort((a, b) => b.rate - a.rate).map(s => this.renderMeter(s))}</div>
            </section>
            <section>
                <h3>Who finished when</h3>
                ${this.renderGrid(users, periods, current)}
            </section>
        `;
    }

    private renderKpis(mine: UserSummary) {
        return html`
            <section class="kpis" aria-label="Your numbers">
                <div class="tile">
                    <div class="tile-label">Current streak</div>
                    <div class="tile-value">${mine.currentStreak > 1 ? "🔥 " : ""}${mine.currentStreak}</div>
                    <div class="tile-note">${mine.doneNow ? "incl. this period" : "periods in a row"}</div>
                </div>
                <div class="tile">
                    <div class="tile-label">Best streak</div>
                    <div class="tile-value">${mine.bestStreak}</div>
                    <div class="tile-note">periods in a row</div>
                </div>
                <div class="tile">
                    <div class="tile-label">Completion</div>
                    <div class="tile-value">${Math.round(mine.rate * 100)}%</div>
                    <div class="tile-note">${mine.done} of ${mine.total} periods</div>
                </div>
            </section>
        `;
    }

    private renderMeter(summary: UserSummary) {
        const percent = Math.round(summary.rate * 100);
        return html`
            <span class="meter-name ${summary.username === this.me ? "me" : ""}">${summary.username}</span>
            <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"
                 aria-label="${summary.username}: ${percent}% completed">
                <div class="meter-fill" style="width: ${percent}%"></div>
            </div>
            <span class="meter-figure">${percent}% · ${summary.done}/${summary.total}</span>
        `;
    }

    private renderGrid(users: string[], periods: PeriodRow[], current: string[]) {
        const labelEvery = periods.length > 14 ? 7 : 1;
        return html`
            <div class="legend" aria-hidden="true">
                <span><span class="mark done"></span>Done</span>
                <span><span class="mark missed"></span>Missed</span>
                <span><span class="mark open"></span>Not done yet (this period)</span>
            </div>
            <div class="scroller">
                <table>
                    <thead>
                    <tr>
                        <td></td>
                        ${periods.map((p, i) => html`
                            <th scope="col" title="${p.date}">
                                ${(periods.length - 1 - i) % labelEvery === 0 ? dayLabel(p.date) : ""}
                            </th>`)}
                        <th scope="col" class="now">Now</th>
                    </tr>
                    </thead>
                    <tbody @pointerleave="${() => this.tip = undefined}" @focusout="${() => this.tip = undefined}">
                    ${users.map(user => html`
                        <tr>
                            <th scope="row" title="${user}">${user}</th>
                            ${periods.map(p => this.renderCell(user, p.date, p.finishers.includes(user) ? "done" : "missed"))}
                            ${this.renderCell(user, "this period", current.includes(user) ? "done" : "open")}
                        </tr>
                    `)}
                    </tbody>
                </table>
            </div>
        `;
    }

    private renderCell(user: string, date: string, state: "done" | "missed" | "open") {
        const status = state === "done" ? "Done" : state === "missed" ? "Missed" : "Not done yet";
        const show = (e: Event) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            this.tip = {status, detail: `${user} · ${date}`, x: rect.left + rect.width / 2 + 8, y: rect.bottom + 6};
        };
        return html`
            <td>
                <button class="cell" aria-label="${user}, ${date}: ${status}" @pointerenter="${show}" @focus="${show}">
                    <span class="mark ${state}"></span>
                </button>
            </td>`;
    }
}
