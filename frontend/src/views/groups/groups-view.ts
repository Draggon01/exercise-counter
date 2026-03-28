import {customElement, state} from 'lit/decorators.js';
import {css, html} from 'lit';
import {ConnectedLitElement} from "../../connectedLitElement";
import {RootState, store} from '../../store';
import {CustomRouter} from "../../index";
import {
    acceptGroupToUser,
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
import {createRef, ref, Ref} from "lit/directives/ref.js";
import {SlInput} from "@shoelace-style/shoelace";


@customElement('groups-view')
export class GroupsView extends ConnectedLitElement {

    static styles = css`
        :host {
            display: block;
            padding: 1rem;
        }

        .page-container {
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
        }

        .header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 1rem;
        }

        .header h2 {
            margin: 0;
        }

        .actions {
            display: flex;
            gap: 8px;
            margin-bottom: 1rem;
        }

        .groups-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .groupCard {
            display: flex;
            align-items: center;
            min-height: 44px;
            border: 1px solid teal;
            border-radius: 8px;
            padding: 0 4px;
            width: 100%;
            box-sizing: border-box;
        }

        .group-label {
            flex: 1;
            margin-left: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .group-actions {
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }

        .icon-decline {
            color: red;
        }

        .icon-accept {
            color: green;
        }

        .visibility-badge {
            font-size: 0.7rem;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 6px;
            flex-shrink: 0;
        }

        .visibility-badge.public {
            background: #d1fae5;
            color: #065f46;
        }

        .visibility-badge.invite-only {
            background: #e0e7ff;
            color: #3730a3;
        }

        .search-results {
            border: 1px solid #ccc;
            border-radius: 4px;
            margin-top: 4px;
            max-height: 200px;
            overflow-y: auto;
        }

        .search-result-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        }

        .search-result-item:last-child {
            border-bottom: none;
        }

        .search-result-item:hover {
            background: #f0f9ff;
        }

        .search-result-item.selected {
            background: #e0f2fe;
            font-weight: bold;
        }

        .no-results {
            padding: 8px 12px;
            color: #666;
            font-style: italic;
        }

        @media (max-width: 768px) {
            :host {
                padding: 0.5rem;
            }

            .header {
                gap: 12px;
            }

            .groupCard {
                min-height: 48px;
            }
        }
    `;

    @state()
    groups: GroupInformationDto[] = [];

    @state()
    openGroupDialog: boolean = false;

    @state()
    groupName: string = "";

    @state()
    groupVisibility: GroupVisibility = "INVITE_ONLY";

    @state()
    openWarningDialog: boolean = false;

    @state()
    openInviteDialog: boolean = false;

    @state()
    openJoinDialog: boolean = false;

    @state()
    groupToDelete?: string = "";

    @state()
    inviteToGroup?: string = "";

    @state()
    joinSearchQuery: string = "";

    @state()
    joinSearchResults: string[] = [];

    @state()
    selectedGroupToJoin: string = "";

    formRef: Ref<HTMLFormElement> = createRef();


    connectedCallback() {
        super.connectedCallback();
        store.dispatch(listUserMappings());
    }

    stateChanged(state: RootState): void {
        let user = selectCurrentUser(state);
        if (user) {
            let groups = selectUserMappingByUser(state, user.username)
            this.groups = groups ? groups.groupInformation : [];
        }
        this.joinSearchResults = selectPublicGroupSearchResults(state);
    }

    protected render() {
        return html`
            <div class="page-container">
                <div class="header">
                    <sl-button
                            @click="${() => {
                                void CustomRouter.goto(`/`);
                            }}"
                            variant="primary"
                    >Back
                    </sl-button>
                    <h2>Groups</h2>
                </div>
                <div class="actions">
                    <sl-button
                            @click="${() => this.openGroupDialog = true}"
                            variant="primary"
                    >
                        Create Group
                    </sl-button>
                    <sl-button
                            @click="${() => {
                                this.joinSearchQuery = "";
                                this.selectedGroupToJoin = "";
                                this.openJoinDialog = true;
                            }}"
                            variant="default"
                    >
                        Join Group
                    </sl-button>
                </div>
                <div class="groups-list">
                    ${this.groups.map(group => group.isInvited ?
                            html`
                                <div class="groupCard">
                                    <div class="group-label">Invited to group: ${group.groupName}</div>
                                    <div class="group-actions">
                                        <sl-icon-button
                                                class="icon-decline"
                                                name="x-lg"
                                                @click="${() => {
                                                    store.dispatch(deleteGroupOnUser(group.groupName));
                                                }}">
                                        </sl-icon-button>
                                        <sl-icon-button
                                                class="icon-accept"
                                                name="check-lg"
                                                @click="${() => {
                                                    store.dispatch(acceptGroupToUser(group.groupName))
                                                }}">
                                        </sl-icon-button>
                                    </div>
                                </div>
                            ` :
                            html`
                                <div class="groupCard">
                                    <div class="group-label">${group.groupName}</div>
                                    <span class="visibility-badge ${group.visibility === 'PUBLIC' ? 'public' : 'invite-only'}">
                                        ${group.visibility === 'PUBLIC' ? 'Public' : 'Invite only'}
                                    </span>
                                    <div class="group-actions">
                                        <sl-icon-button
                                                name="plus-lg"
                                                @click="${() => {
                                                    this.inviteToGroup = group.groupName;
                                                    this.openInviteDialog = true;
                                                }}">
                                        </sl-icon-button>
                                        <sl-icon-button
                                                name="trash"
                                                @click="${() => {
                                                    this.groupToDelete = group.groupName;
                                                    this.openWarningDialog = true;
                                                }}">
                                        </sl-icon-button>
                                    </div>
                                </div>
                            `)}
                </div>
            </div>

            <sl-dialog label="Create Group"
                       .open="${this.openGroupDialog}"
                       @sl-hide="${() => {
                           this.openGroupDialog = false;
                       }}">
                ${this.renderGroupCreateDialog()}
            </sl-dialog>

            <sl-dialog label="Join Public Group"
                       .open="${this.openJoinDialog}"
                       @sl-hide="${() => {
                           this.openJoinDialog = false;
                           this.joinSearchQuery = "";
                           this.selectedGroupToJoin = "";
                       }}">
                ${this.renderJoinDialog()}
            </sl-dialog>

            <sl-dialog .open="${this.openWarningDialog}"
                       @sl-hide="${() => {
                           this.openWarningDialog = false
                           this.groupToDelete = undefined;
                       }}"
                       label="Warning">
                ${this.renderWarningDialog()}
            </sl-dialog>


            <sl-dialog .open="${this.openInviteDialog}"
                       @sl-hide="${() => {
                           this.openInviteDialog = false
                           this.inviteToGroup = undefined;
                       }}"
                       label="Invite">
                ${this.renderInviteDialog()}
            </sl-dialog>
        `;
    }

    private renderGroupCreateDialog() {
        return html`
            <p>Hint: Group names are not allowed to include spaces</p>
            <form ${ref(this.formRef)} @sl-hide="${(e: any) => e.stopPropagation()}">
                <sl-input
                        label="Group Name"
                        name="groupName"
                        .value="${this.groupName}"
                        pattern="[^\\s]+"
                        required>
                </sl-input>
                <sl-radio-group
                        label="Visibility"
                        name="visibility"
                        .value="${this.groupVisibility}"
                        @sl-change="${(e: any) => { this.groupVisibility = e.target.value as GroupVisibility; }}"
                        style="margin-top: 1rem;">
                    <sl-radio value="INVITE_ONLY">Invite Only</sl-radio>
                    <sl-radio value="PUBLIC">Public</sl-radio>
                </sl-radio-group>
            </form>
            <sl-button slot="footer" variant="danger" @click="${() => {
                this.groupName = "";
                this.groupVisibility = "INVITE_ONLY";
                this.openGroupDialog = false;
            }}">
                Close
            </sl-button>
            <sl-button slot="footer" variant="primary" @click="${() => {
                this.handleCreateGroup()
            }}">
                Add
            </sl-button>
        `;
    }

    private handleCreateGroup() {
        this.formRef.value!.childNodes.forEach(child => {
            if (Object.prototype.hasOwnProperty.call(child, 'reportValidity') && typeof (child as any).reportValidity === 'function') {
                (child as any).reportValidity();
            }
        });

        if (this.formRef.value!.checkValidity()) {
            let formData = new FormData(this.formRef.value!);
            let groupName = formData!.get("groupName")!.toString();
            store.dispatch(createGroupOnUser({groupName, visibility: this.groupVisibility}))
            this.openGroupDialog = false;
            this.groupName = "";
            this.groupVisibility = "INVITE_ONLY";
        } else {
            this.formRef.value!.reportValidity();
        }
    }

    private renderJoinDialog() {
        return html`
            <p>Search for public groups to join:</p>
            <sl-input
                    label="Group Name"
                    placeholder="Type to search..."
                    .value="${this.joinSearchQuery}"
                    @sl-input="${(e: any) => {
                        this.joinSearchQuery = e.target.value;
                        this.selectedGroupToJoin = "";
                        if (this.joinSearchQuery.length > 0) {
                            store.dispatch(searchPublicGroups(this.joinSearchQuery));
                        } else {
                            store.dispatch({type: 'group/clearSearch'});
                        }
                    }}">
            </sl-input>
            ${this.joinSearchQuery.length > 0 ? html`
                <div class="search-results">
                    ${this.joinSearchResults.length > 0 ? this.joinSearchResults.map(name => html`
                        <div class="search-result-item ${this.selectedGroupToJoin === name ? 'selected' : ''}"
                             @click="${() => {
                                 this.selectedGroupToJoin = name;
                                 this.joinSearchQuery = name;
                             }}">
                            ${name}
                        </div>
                    `) : html`
                        <div class="no-results">No public groups found</div>
                    `}
                </div>
            ` : ''}
            <sl-button slot="footer" variant="primary" @click="${() => {
                this.openJoinDialog = false;
                this.joinSearchQuery = "";
                this.selectedGroupToJoin = "";
            }}">
                Close
            </sl-button>
            <sl-button slot="footer" variant="success"
                       ?disabled="${!this.selectedGroupToJoin}"
                       @click="${() => {
                           if (this.selectedGroupToJoin) {
                               store.dispatch(joinPublicGroup(this.selectedGroupToJoin));
                               this.openJoinDialog = false;
                               this.joinSearchQuery = "";
                               this.selectedGroupToJoin = "";
                           }
                       }}">
                Join
            </sl-button>
        `;
    }

    private renderWarningDialog() {
        return html`
            <p>
                You are about to delete this Group, if you are the
                last user assigned to this group, the group will be
                completely removed, and no exercise will be linked to it
                anymore, do you want to proceed?
            </p>
            <sl-button slot="footer" variant="primary" @click="${() => {
                this.openWarningDialog = false;
                this.groupToDelete = undefined;
            }}"> Close
            </sl-button>
            <sl-button slot="footer" variant="danger" @click="${() => {
                this.openWarningDialog = false;
                if (this.groupToDelete) {
                    store.dispatch(deleteGroupOnUser(this.groupToDelete))
                }
                this.groupToDelete = undefined;
            }}">
                Delete Group
            </sl-button>
        `
    }

    private renderInviteDialog() {
        let inviteInput: Ref<SlInput> = createRef();
        return html`
            <sl-input ${ref(inviteInput)} label="Name"></sl-input>
            <sl-button slot="footer" variant="primary" @click="${() => {
                this.openInviteDialog = false;
                this.inviteToGroup = undefined;
                if (inviteInput.value) {
                    inviteInput.value.value = "";
                }
            }}"> Close
            </sl-button>
            <sl-button slot="footer" variant="danger" @click="${() => {
                this.openInviteDialog = false;
                if (this.inviteToGroup) {
                    let userToInvite = inviteInput.value!.value;
                    store.dispatch(inviteUserToGroup([userToInvite, this.inviteToGroup]))
                }
                this.inviteToGroup = undefined;
                if (inviteInput.value) {
                    inviteInput.value.value = "";
                }
            }}">
                Invite
            </sl-button>
        `
    }
}
