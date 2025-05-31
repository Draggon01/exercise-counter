import {GroupInformationDto} from "./GroupInformationDto";

export interface UserGroupMappingDto {
    username: string,
    groupInformation: GroupInformationDto[]
}