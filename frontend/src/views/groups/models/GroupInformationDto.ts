import {GroupVisibility} from "./GroupVisibility";

export interface GroupInformationDto {
    groupName: string;
    isInvited: boolean;
    visibility: GroupVisibility;
}
