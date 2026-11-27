/** Who is in a group: members and people invited but not joined yet, each sorted by name. */
export interface GroupMembersDto {
    members: string[];
    invited: string[];
}
