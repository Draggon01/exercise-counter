import {describe, expect, it} from "vitest";
import {groupReducer, loadGroupMembers} from "./groupSlice";

const initial = groupReducer(undefined, {type: "init"});
const members = {members: ["anna", "leo"], invited: ["ben"]};

describe("group slice: members", () => {
    it("loads the members of the opened group", () => {
        let state = groupReducer(initial, loadGroupMembers.pending("r1", "Family"));
        expect(state.groupMembers).toMatchObject({groupName: "Family", status: "loading"});
        state = groupReducer(state, loadGroupMembers.fulfilled(members, "r1", "Family"));
        expect(state.groupMembers).toEqual({groupName: "Family", status: "idle", members});
    });

    it("does not show the list of another group, ignores late answers", () => {
        let state = groupReducer(initial, loadGroupMembers.fulfilled(members, "r1", "Family"));
        state = groupReducer(groupReducer(state, loadGroupMembers.pending("r0", "Family")), loadGroupMembers.fulfilled(members, "r0", "Family"));
        state = groupReducer(state, loadGroupMembers.pending("r2", "Work"));
        expect(state.groupMembers.members).toBeUndefined();

        state = groupReducer(state, loadGroupMembers.fulfilled(members, "r1", "Family"));
        expect(state.groupMembers).toMatchObject({groupName: "Work", status: "loading"});
        expect(state.groupMembers.members).toBeUndefined();
    });

    it("keeps the list while it loads again (reopened)", () => {
        let state = groupReducer(initial, loadGroupMembers.pending("r1", "Family"));
        state = groupReducer(state, loadGroupMembers.fulfilled(members, "r1", "Family"));
        state = groupReducer(state, loadGroupMembers.pending("r2", "Family"));
        expect(state.groupMembers.members).toEqual(members);
    });
});
