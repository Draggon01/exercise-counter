import {GroupVisibility} from "./GroupVisibility";

export interface GroupInformationDto {
    groupName: string;
    isInvited: boolean;
    visibility: GroupVisibility;
    /** Members of the group (pending invitations not counted). */
    memberCount: number;
}
