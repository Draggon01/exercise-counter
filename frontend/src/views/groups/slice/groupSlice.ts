import {AsyncStoreState} from "../../../commons";
import {createEntityAdapter, createSlice, EntityState, Reducer} from "@reduxjs/toolkit";
import {ExerciseGroupMappingDto} from "../models/ExerciseGroupMappingDto";
import {UserGroupMappingDto} from "../models/UserGroupMappingDto";
import {GroupVisibility} from "../models/GroupVisibility";
import {apiDelete, apiGet, apiPost, apiThunk} from "../../../api/http";

type SliceState = {
    exerciseMappings: {
        status: AsyncStoreState;
    } & EntityState<ExerciseGroupMappingDto, string>,
    userMappings: {
        status: AsyncStoreState;
    } & EntityState<UserGroupMappingDto, string>,
    publicGroupSearch: {
        status: AsyncStoreState;
        results: string[];
    }
}

type SliceProjection = {
    group: SliceState
}

const initialState: SliceState = {
    exerciseMappings: {
        status: "initial",
        ids: [],
        entities: {}
    },
    userMappings: {
        status: "initial",
        ids: [],
        entities: {}
    },
    publicGroupSearch: {
        status: "initial",
        results: []
    }
}

/** Groups are addressed by (URL-encoded) name. */
const groupUrl = (groupName: string) => `/api/groups/${encodeURIComponent(groupName)}`;

/** Exercise → group names, limited to the user's groups. */
export const listExerciseMappings = apiThunk<ExerciseGroupMappingDto[]>(
    'exerciseMappings/list', () => apiGet("/api/groups/exercise-mappings"));

/** The current user's memberships and invitations (a list with one entry). */
export const listUserMappings = apiThunk<UserGroupMappingDto[]>(
    'userMappings/list', () => apiGet("/api/groups/mine"));

export const createGroupOnUser = apiThunk<UserGroupMappingDto, { groupName: string, visibility: GroupVisibility }>(
    'userMappings/create', group => apiPost("/api/groups", group));

export const searchPublicGroups = apiThunk<string[], string>(
    'group/searchPublic', query => apiGet(`/api/groups/public?query=${encodeURIComponent(query)}`));

export const joinPublicGroup = apiThunk<UserGroupMappingDto, string>(
    'group/joinPublic', groupName => apiPost(`${groupUrl(groupName)}/join`));

/** Leave a group or decline an invitation. */
export const deleteGroupOnUser = apiThunk<UserGroupMappingDto, string>(
    'userMappings/delete', groupName => apiDelete(`${groupUrl(groupName)}/membership`));

/** [username, groupName] → false if the user does not exist or is already in the group. */
export const inviteUserToGroup = apiThunk<boolean, [string, string]>(
    'userMappings/invite', ([username, groupName]) => apiPost(`${groupUrl(groupName)}/invitations`, {username}));

export const acceptGroupToUser = apiThunk<UserGroupMappingDto, string>(
    'userMappings/accept', groupName => apiPost(`${groupUrl(groupName)}/accept`));

export const groupSlice = createSlice({
    name: 'group',
    initialState: initialState,
    reducers: {
        clearPublicGroupSearch(state) {
            state.publicGroupSearch.results = [];
            state.publicGroupSearch.status = 'initial';
        }
    },
    extraReducers: builder => {
        builder
            .addCase(listExerciseMappings.pending, state => {
                state.exerciseMappings.status = 'initial';
            })
            .addCase(listExerciseMappings.rejected, state => {
                state.exerciseMappings.status = 'error';
            })
            .addCase(listExerciseMappings.fulfilled, (state, action) => {
                state.exerciseMappings.status = 'idle';
                exerciseMappingsAdapter.setAll(state.exerciseMappings, action.payload)
            })
            .addCase(listUserMappings.pending, state => {
                state.userMappings.status = 'initial';
            })
            .addCase(listUserMappings.rejected, state => {
                state.userMappings.status = 'error';
            })
            .addCase(listUserMappings.fulfilled, (state, action) => {
                state.userMappings.status = 'idle';
                userMappingsAdapter.setAll(state.userMappings, action.payload);
            })
            .addCase(createGroupOnUser.pending, state => {
                state.exerciseMappings.status = 'initial';
            })
            .addCase(createGroupOnUser.rejected, state => {
                state.exerciseMappings.status = 'error';
            })
            .addCase(createGroupOnUser.fulfilled, (state, action) => {
                state.exerciseMappings.status = 'idle';
                userMappingsAdapter.upsertOne(state.userMappings, action.payload);
            })
            .addCase(deleteGroupOnUser.pending, state => {
                state.exerciseMappings.status = 'initial';
            })
            .addCase(deleteGroupOnUser.rejected, state => {
                state.exerciseMappings.status = 'error';
            })
            .addCase(deleteGroupOnUser.fulfilled, (state, action) => {
                state.exerciseMappings.status = 'idle';
                userMappingsAdapter.upsertOne(state.userMappings, action.payload);
            })
            .addCase(acceptGroupToUser.pending, state => {
                state.exerciseMappings.status = 'initial';
            })
            .addCase(acceptGroupToUser.rejected, state => {
                state.exerciseMappings.status = 'error';
            })
            .addCase(acceptGroupToUser.fulfilled, (state, action) => {
                state.exerciseMappings.status = 'idle';
                userMappingsAdapter.upsertOne(state.userMappings, action.payload);
            })
            .addCase(searchPublicGroups.pending, state => {
                state.publicGroupSearch.status = 'initial';
            })
            .addCase(searchPublicGroups.rejected, state => {
                state.publicGroupSearch.status = 'error';
            })
            .addCase(searchPublicGroups.fulfilled, (state, action) => {
                state.publicGroupSearch.status = 'idle';
                state.publicGroupSearch.results = action.payload;
            })
            .addCase(joinPublicGroup.fulfilled, (state, action) => {
                state.publicGroupSearch.results = [];
                userMappingsAdapter.upsertOne(state.userMappings, action.payload);
            })
    }
});

export const { clearPublicGroupSearch } = groupSlice.actions;

export const groupReducer = groupSlice.reducer as Reducer<SliceState>;

export const exerciseMappingsAdapter = createEntityAdapter<ExerciseGroupMappingDto, string>({
    selectId: (exerciseMapping: ExerciseGroupMappingDto) => exerciseMapping.exerciseId
});

export const userMappingsAdapter = createEntityAdapter<UserGroupMappingDto, string>({
    selectId: (userMapping: UserGroupMappingDto) => userMapping.username
});

export const {
    selectAll: selectAllExerciseMappings,
} = exerciseMappingsAdapter.getSelectors((state: SliceProjection) => state.group.exerciseMappings);

export const {
    selectAll: selectAllUserMappings,
    selectById: selectUserMappingByUser,
} = userMappingsAdapter.getSelectors((state: SliceProjection) => state.group.userMappings);

export const selectPublicGroupSearchResults = (state: SliceProjection) => state.group.publicGroupSearch.results;
