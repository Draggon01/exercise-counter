import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {ChangelogEntry} from "../shared-slices/changelog/changelogSlice";

/**
 * List of changelog entries (version, date, title, items). Used by the "what's new" dialog
 * and the changelog in the options.
 */
@customElement("changelog-entries")
export class ChangelogEntries extends LitElement {

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        article + article {
            padding-top: var(--app-space-4);
            border-top: 1px solid var(--app-divider);
        }

        header {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: var(--app-space-2);
        }

        h3 {
            margin: 0;
            font-size: 1rem;
            color: var(--app-text);
        }

        .version {
            padding: 1px var(--app-space-2);
            border-radius: var(--app-radius-pill);
            background: var(--app-accent-soft);
            color: var(--app-accent);
            font-size: 0.8em;
            font-weight: 600;
        }

        time {
            font-size: 0.85em;
            color: var(--app-text-subtle);
        }

        ul {
            margin: var(--app-space-2) 0 0;
            padding-left: 1.2em;
            color: var(--app-text-muted);
        }

        li + li {
            margin-top: var(--app-space-1);
        }
    `;

    @property({attribute: false})
    entries: ChangelogEntry[] = [];

    render() {
        return this.entries.map(entry => html`
            <article>
                <header>
                    <span class="version">v${entry.version}</span>
                    <h3>${entry.title}</h3>
                    <time>${entry.date}</time>
                </header>
                <ul>${entry.items.map(item => html`<li>${item}</li>`)}</ul>
            </article>
        `);
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "changelog-entries": ChangelogEntries;
    }
}
