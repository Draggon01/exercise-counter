import {customElement, state} from 'lit/decorators.js';
import {touchStyles} from "../../styles/touch";
import {css, html, nothing} from 'lit';
import {createRef, ref, Ref} from "lit/directives/ref.js";
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {
    acceptGroupToUser,
    clearPublicGroupSearch,
    createGroupOnUser,
    deleteGroupOnUser,
    inviteUserToGroup,
    joinPublicGroup,
    listUserMappings,
    searchPublicGroups,
    selectPublicGroupSearchResults,
    selectUserMappingByUser
} from "./slice/groupSlice";
import {selectCurrentUser} from "../login/slice/userSlice";
import {GroupInformationDto} from "./models/GroupInformationDto";
import {GroupVisibility} from "./models/GroupVisibility";
import {AsyncStoreState} from "../../commons";
import {pageStyles} from "../../styles/page";
import {validateForm} from "../../utils/form";
import {toast} from "../../components/toast";
import "../../components/page-header";
import "../../components/confirm-dialog";
import "../../components/empty-state";
import type {SlInput, SlRadioGroup} from "@shoelace-style/shoelace";

const VISIBILITY_LABEL: Record<GroupVisibility, string> = {INVITE_ONLY: "Invite only", PUBLIC: "Public"};
const VISIBILITY_HINT: Record<GroupVisibility, string> = {
    INVITE_ONLY: "Only people you invite can join.",
    PUBLIC: "Everybody can find and join the group.",
};

/**
 * Groups of the current user: pending invitations, memberships (invite / leave),
 * creating a group and joining a public one.
 */
@customElement('groups-view')
export class GroupsView extends ConnectedLitElement {

    static styles = [pageStyles, touchStyles, css`
        section + section {
            margin-top: var(--app-space-5);
        }

        h3 {
            margin: 0 0 var(--app-space-2);
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--app-text-muted);
        }

        .list {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-2);
        }

        .group {
            display: flex;
            align-items: center;
            gap: var(--app-space-3);
            padding: var(--app-space-3) var(--app-space-4);
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius);
            background: var(--app-surface);
            box-shadow: var(--app-shadow);
        }

        .group.invitation {
            border-color: var(--app-accent);
            background: var(--app-accent-soft);
        }

        .group-icon {
            flex-shrink: 0;
            display: grid;
            place-items: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--app-accent-soft);
            color: var(--app-accent);
            font-size: 1.2rem;
        }

        .invitation .group-icon {
            background: var(--app-surface);
        }

        .group-text {
            flex: 1;
            min-width: 0;
        }

        .group-name {
            font-weight: 600;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .group-meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: var(--app-space-2);
            margin-top: 2px;
            font-size: 0.85em;
            color: var(--app-text-muted);
        }

        .badge {
            padding: 1px var(--app-space-2);
            border-radius: var(--app-radius-pill);
            font-size: 0.85em;
        }

        .badge.public {
            background: var(--app-success-soft);
            color: var(--app-success-strong);
        }

        .badge.invite-only {
            background: var(--app-surface-muted);
            color: var(--app-text-muted);
        }

        .group-actions {
            display: flex;
            align-items: center;
            gap: var(--app-space-1);
            flex-shrink: 0;
        }

        .group-actions sl-icon-button {
            font-size: 1.15rem;
        }

        .leave::part(base) {
            color: var(--app-danger);
        }

        .skeleton {
            --border-radius: var(--app-radius);
            height: 66px;
        }

        /* dialogs */
        .dialog-form {
            display: flex;
            flex-direction: column;
            gap: var(--app-space-4);
        }

        .hint {
            margin: var(--app-space-1) 0 0;
            font-size: var(--sl-input-help-text-font-size-medium);
            color: var(--app-text-muted);
        }

        sl-radio-group::part(button-group),
        sl-radio-group::part(button-group__base) {
            width: 100%;
        }

        sl-radio-button {
            flex: 1;
        }

        .results {
            display: flex;
            flex-direction: column;
            max-height: 240px;
            overflow-y: auto;
            border: 1px solid var(--app-border);
            border-radius: var(--app-radius-sm);
        }

        .result {
            display: flex;
            align-items: center;
            gap: var(--app-space-2);
            padding: var(--app-space-3);
            border: none;
            border-bottom: 1px solid var(--app-divider);
            background: none;
            color: var(--app-text);
            font: inherit;
            text-align: left;
            cursor: pointer;
        }

        .result:last-child {
            border-bottom: none;
        }

        .result:hover {
            background: var(--app-surface-muted);
        }

        .result.selected {
            background: var(--app-accent-soft);
            color: var(--app-accent);
            font-weight: 600;
        }

        .no-results {
            padding: var(--app-space-3);
            color: var(--app-text-muted);
            text-align: center;
        }

        @media (max-width: 480px) {
            .header-label {
                display: none;
            }
        }
    `];

    @state()
    private groups: GroupInformationDto[] = [];

    @state()
    private status: AsyncStoreState = "initial";

    @state()
    private createOpen = false;

    @state()
    private newVisibility: GroupVisibility = "INVITE_ONLY";

    @state()
    private joinOpen = false;

    @state()
    private joinQuery = "";

    @state()
    private joinResults: string[] = [];

    @state()
    private joinSelected = "";

    /** Group to invite someone to (invite dialog open while set). */
    @state()
    private inviteTo?: string;

    /** Group to leave (confirm dialog open while set). */
    @state()
    private leaveGroup?: string;

    private createFormRef: Ref<HTMLFormElement> = createRef();
    private inviteFormRef: Ref<HTMLFormElement> = createRef();

    connectedCallback() {
        super.connectedCallback();
        store.dispatch(listUserMappings());
    }

    stateChanged(state: RootState): void {
        const user = selectCurrentUser(state);
        if (user) {
            this.groups = selectUserMappingByUser(state, user.username)?.groupInformation ?? [];
        }
        this.status = state.group.userMappings.status;
        this.joinResults = selectPublicGroupSearchResults(state);
    }

    protected render() {
        const invitations = this.groups.filter(group => group.isInvited);
        const memberships = this.groups.filter(group => !group.isInvited);
        return html`
            <div class="page-container">
                <page-header heading="Groups">
                    <sl-button slot="actions" @click="${this.openJoin}">
                        <sl-icon slot="prefix" name="search"></sl-icon>
                        <span class="header-label">Join</span>
                    </sl-button>
                    <sl-button slot="actions" variant="primary" @click="${this.openCreate}">
                        <sl-icon slot="prefix" name="plus-lg"></sl-icon>
                        <span class="header-label">New group</span>
                    </sl-button>
                </page-header>

                ${invitations.length > 0 ? html`
                    <section>
                        <h3>Invitations</h3>
                        <div class="list">${invitations.map(group => this.renderInvitation(group))}</div>
                    </section>
                ` : nothing}

                <section>
                    ${invitations.length > 0 ? html`<h3>Your groups</h3>` : nothing}
                    <div class="list">${this.renderMemberships(memberships)}</div>
                </section>
            </div>

            ${this.renderCreateDialog()}
            ${this.renderJoinDialog()}
            ${this.renderInviteDialog()}
            <confirm-dialog label="Leave group" confirmLabel="Leave group" cancelLabel="Stay"
                            .open="${this.leaveGroup !== undefined}"
                            @confirm="${this.confirmLeave}"
                            @cancel="${() => this.leaveGroup = undefined}">
                Do you want to leave <strong>${this.leaveGroup}</strong>? If you are the last member, the group
                is deleted and its exercises are no longer shared with anyone.
            </confirm-dialog>
        `;
    }

    private renderMemberships(memberships: GroupInformationDto[]) {
        if (this.status === "error") {
            return html`
                <empty-state icon="cloud-slash" heading="Could not load your groups">
                    <sl-button @click="${() => store.dispatch(listUserMappings())}">Try again</sl-button>
                </empty-state>`;
        }
        if (this.status !== "idle") {
            return [1, 2].map(() => html`<sl-skeleton effect="pulse" class="skeleton"></sl-skeleton>`);
        }
        if (memberships.length === 0) {
            return html`
                <empty-state icon="people" heading="You are not in any group yet"
                             text="Groups let you share exercises with friends and family.">
                    <sl-button variant="primary" @click="${this.openCreate}">New group</sl-button>
                    <sl-button @click="${this.openJoin}">Join a public group</sl-button>
                </empty-state>`;
        }
        return memberships.map(group => html`
            <div class="group">
                <div class="group-icon"><sl-icon name="people-fill"></sl-icon></div>
                <div class="group-text">
                    <div class="group-name">${group.groupName}</div>
                    <div class="group-meta">
                        <span>${group.memberCount} ${group.memberCount === 1 ? "member" : "members"}</span>
                        <span class="badge ${group.visibility === "PUBLIC" ? "public" : "invite-only"}">
                            ${VISIBILITY_LABEL[group.visibility] ?? group.visibility}
                        </span>
                    </div>
                </div>
                <div class="group-actions">
                    <sl-tooltip content="Invite someone">
                        <sl-icon-button name="person-plus" label="Invite someone to ${group.groupName}"
                                        @click="${() => this.inviteTo = group.groupName}"></sl-icon-button>
                    </sl-tooltip>
                    <sl-tooltip content="Leave group">
                        <sl-icon-button class="leave" name="box-arrow-right" label="Leave ${group.groupName}"
                                        @click="${() => this.leaveGroup = group.groupName}"></sl-icon-button>
                    </sl-tooltip>
                </div>
            </div>
        `);
    }

    private renderInvitation(group: GroupInformationDto) {
        return html`
            <div class="group invitation">
                <div class="group-icon"><sl-icon name="envelope-open"></sl-icon></div>
                <div class="group-text">
                    <div class="group-name">${group.groupName}</div>
                    <div class="group-meta">You were invited to join</div>
                </div>
                <div class="group-actions">
                    <sl-button size="small" @click="${() => store.dispatch(deleteGroupOnUser(group.groupName))}">
                        Decline
                    </sl-button>
                    <sl-button size="small" variant="primary" @click="${() => this.accept(group.groupName)}">
                        Accept
                    </sl-button>
                </div>
            </div>
        `;
    }

    private renderCreateDialog() {
        return html`
            <sl-dialog label="New group" .open="${this.createOpen}" @sl-request-close="${() => this.createOpen = false}">
                ${this.createOpen ? html`
                    <form class="dialog-form" ${ref(this.createFormRef)}
                          @submit="${(e: Event) => { e.preventDefault(); this.create(); }}">
                        <sl-input name="groupName" label="Name" required autofocus
                                  pattern="[^/\\\\]+" help-text="Not allowed: / and \\"></sl-input>
                        <div>
                            <sl-radio-group name="visibility" label="Who can join?" .value="${this.newVisibility}"
                                            @sl-change="${(e: Event) => this.newVisibility = (e.target as SlRadioGroup).value as GroupVisibility}">
                                <sl-radio-button value="INVITE_ONLY">Invite only</sl-radio-button>
                                <sl-radio-button value="PUBLIC">Public</sl-radio-button>
                            </sl-radio-group>
                            <p class="hint">${VISIBILITY_HINT[this.newVisibility]}</p>
                        </div>
                    </form>
                ` : nothing}
                <sl-button slot="footer" @click="${() => this.createOpen = false}">Cancel</sl-button>
                <sl-button slot="footer" variant="primary" @click="${this.create}">Create group</sl-button>
            </sl-dialog>
        `;
    }

    private renderJoinDialog() {
        return html`
            <sl-dialog label="Join a public group" .open="${this.joinOpen}" @sl-request-close="${this.closeJoin}">
                <div class="dialog-form">
                    <sl-input label="Search" placeholder="Group name" clearable .value="${this.joinQuery}"
                              @sl-input="${this.search}" @sl-clear="${this.search}">
                        <sl-icon slot="prefix" name="search"></sl-icon>
                    </sl-input>
                    ${this.joinQuery ? html`
                        <div class="results" role="listbox">
                            ${this.joinResults.length > 0 ? this.joinResults.map(name => html`
                                <button class="result ${this.joinSelected === name ? "selected" : ""}" role="option"
                                        aria-selected="${this.joinSelected === name}"
                                        @click="${() => this.joinSelected = name}">
                                    <sl-icon name="people"></sl-icon>${name}
                                </button>
                            `) : html`<div class="no-results">No public group found for "${this.joinQuery}"</div>`}
                        </div>
                    ` : nothing}
                </div>
                <sl-button slot="footer" @click="${this.closeJoin}">Cancel</sl-button>
                <sl-button slot="footer" variant="primary" ?disabled="${!this.joinSelected}" @click="${this.join}">
                    Join ${this.joinSelected}
                </sl-button>
            </sl-dialog>
        `;
    }

    private renderInviteDialog() {
        return html`
            <sl-dialog label="Invite to ${this.inviteTo ?? ""}" .open="${this.inviteTo !== undefined}"
                       @sl-request-close="${() => this.inviteTo = undefined}">
                ${this.inviteTo !== undefined ? html`
                    <form class="dialog-form" ${ref(this.inviteFormRef)}
                          @submit="${(e: Event) => { e.preventDefault(); this.invite(); }}">
                        <sl-input name="username" label="Username" required autofocus
                                  help-text="They see the invitation on their Groups page."></sl-input>
                    </form>
                ` : nothing}
                <sl-button slot="footer" @click="${() => this.inviteTo = undefined}">Cancel</sl-button>
                <sl-button slot="footer" variant="primary" @click="${this.invite}">Send invitation</sl-button>
            </sl-dialog>
        `;
    }

    private openCreate = () => {
        this.newVisibility = "INVITE_ONLY";
        this.createOpen = true;
    }

    private openJoin = () => {
        this.joinQuery = "";
        this.joinSelected = "";
        store.dispatch(clearPublicGroupSearch());
        this.joinOpen = true;
    }

    private closeJoin = () => {
        this.joinOpen = false;
    }

    private create = async () => {
        const form = this.createFormRef.value;
        if (!form || !validateForm(form)) return;
        const groupName = (form.querySelector('[name="groupName"]') as SlInput).value.trim();
        const result = await store.dispatch(createGroupOnUser({groupName, visibility: this.newVisibility}));
        if (createGroupOnUser.fulfilled.match(result)) {
            this.createOpen = false;
            toast(`Group "${groupName}" created`, "success");
        }
    }

    private search = (e: Event) => {
        this.joinQuery = (e.target as SlInput).value;
        this.joinSelected = "";
        if (this.joinQuery) {
            store.dispatch(searchPublicGroups(this.joinQuery));
        } else {
            store.dispatch(clearPublicGroupSearch());
        }
    }

    private join = async () => {
        const name = this.joinSelected;
        const result = await store.dispatch(joinPublicGroup(name));
        if (joinPublicGroup.fulfilled.match(result)) {
            this.joinOpen = false;
            toast(`You joined "${name}"`, "success");
        }
    }

    private accept = async (groupName: string) => {
        const result = await store.dispatch(acceptGroupToUser(groupName));
        if (acceptGroupToUser.fulfilled.match(result)) {
            toast(`You joined "${groupName}"`, "success");
        }
    }

    private invite = async () => {
        const form = this.inviteFormRef.value;
        const group = this.inviteTo;
        if (!form || !group || !validateForm(form)) return;
        const username = (form.querySelector('[name="username"]') as SlInput).value.trim();
        const result = await store.dispatch(inviteUserToGroup([username, group]));
        if (!inviteUserToGroup.fulfilled.match(result)) {
            return; // the error toast comes from the middleware
        }
        if (result.payload) {
            this.inviteTo = undefined;
            toast(`Invitation sent to ${username}`, "success");
        } else {
            toast(`${username} does not exist or is already in "${group}"`, "warning");
        }
    }

    private confirmLeave = () => {
        if (this.leaveGroup) {
            store.dispatch(deleteGroupOnUser(this.leaveGroup));
        }
        this.leaveGroup = undefined;
    }
}
