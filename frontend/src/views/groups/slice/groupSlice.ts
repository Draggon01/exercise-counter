import {AsyncStoreState} from "../../../commons";
import {createAsyncThunk, createEntityAdapter, createSlice, EntityState, Reducer} from "@reduxjs/toolkit";
import {ExerciseGroupMappingDto} from "../models/ExerciseGroupMappingDto";
import {UserGroupMappingDto} from "../models/UserGroupMappingDto";
import {GroupVisibility} from "../models/GroupVisibility";

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

export const listExerciseMappings = createAsyncThunk<ExerciseGroupMappingDto[], void, { rejectValue: any }>(
    'exerciseMappings/list', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/groups/exercises/list", {
            method: 'GET',
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

export const listUserMappings = createAsyncThunk<UserGroupMappingDto[], void, { rejectValue: any }>(
    'userMappings/list', async (_, {rejectWithValue}) => {
        const res = await fetch("/api/groups/user/list", {
            method: 'GET',
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

export const createGroupOnUser = createAsyncThunk<UserGroupMappingDto, { groupName: string, visibility: GroupVisibility }, { rejectValue: any }>(
    'userMappings/create', async ({groupName, visibility}, {rejectWithValue}) => {
        const res = await fetch("/api/groups/user/create", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({groupName, visibility}),
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

export const searchPublicGroups = createAsyncThunk<string[], string, { rejectValue: any }>(
    'group/searchPublic', async (query, {rejectWithValue}) => {
        const res = await fetch(`/api/groups/public/search?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

export const joinPublicGroup = createAsyncThunk<UserGroupMappingDto, string, { rejectValue: any }>(
    'group/joinPublic', async (groupName, {rejectWithValue}) => {
        const res = await fetch("/api/groups/user/join", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: groupName,
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

export const deleteGroupOnUser = createAsyncThunk<UserGroupMappingDto, string, { rejectValue: any }>(
    'userMappings/delete', async (groupName, {rejectWithValue}) => {
        const res = await fetch("/api/groups/user/delete", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: groupName,
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

export const inviteUserToGroup = createAsyncThunk<boolean, [string, string], { rejectValue: any }>(
    'userMappings/invite', async ([user, group], {rejectWithValue}) => {
        const res = await fetch("/api/groups/user/invite", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: user,
                groupName: group
            }),
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

export const acceptGroupToUser = createAsyncThunk<UserGroupMappingDto, string, { rejectValue: any }>(
    'userMappings/accept', async (group, {rejectWithValue}) => {
        const res = await fetch("/api/groups/user/accept", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: group,
            credentials: "include"
        });
        if (res.ok) {
            return (await res.json());
        } else {
            let errorResponse = await res.json();
            return rejectWithValue(errorResponse);
        }
    }
)

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
