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
    listUserMappings,
    selectUserMappingByUser
} from "./slice/groupSlice";
import {selectCurrentUser} from "../login/slice/userSlice";
import {GroupInformationDto} from "./models/GroupInformationDto";
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
    openWarningDialog: boolean = false;

    @state()
    openInviteDialog: boolean = false;

    @state()
    groupToDelete?: string = "";

    @state()
    inviteToGroup?: string = "";

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
            </form>
            <sl-button slot="footer" variant="danger" @click="${() => {
                this.groupName = "";
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
            store.dispatch(createGroupOnUser(groupName))
            this.openGroupDialog = false;
            this.groupName = "";
        } else {
            this.formRef.value!.reportValidity();
        }
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