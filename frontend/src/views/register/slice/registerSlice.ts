import {AsyncStoreState} from "../../../commons";
import {createAsyncThunk, createSlice, Reducer} from "@reduxjs/toolkit";

type SliceState = {
    validationStatus: AsyncStoreState;
    isValid: boolean | null;
}

const initialState: SliceState = {
    validationStatus: "initial",
    isValid: null
}

type SliceProjection = {
    register: SliceState
}

export const validateRegisterId = createAsyncThunk<boolean, string, { rejectValue: any }>(
    'register/validateId', async (registerId, {rejectWithValue}) => {
        const res = await fetch("/api/public/isInviteLinkValid", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: registerId,
            credentials: "include"
        });
        if (res.ok) {
            return await res.json() as boolean;
        } else {
            return rejectWithValue("Failed to validate registration link");
        }
    });

const registerSlice = createSlice({
    name: 'register',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(validateRegisterId.pending, (state) => {
                state.validationStatus = "loading";
                state.isValid = null;
            })
            .addCase(validateRegisterId.fulfilled, (state, action) => {
                state.validationStatus = "idle";
                state.isValid = action.payload;
            })
            .addCase(validateRegisterId.rejected, (state) => {
                state.validationStatus = "error";
                state.isValid = false;
            });
    }
});

export const registerReducer: Reducer<SliceState> = registerSlice.reducer;
export const selectValidationStatus = (state: SliceProjection) => state.register.validationStatus;
export const selectIsValid = (state: SliceProjection) => state.register.isValid;
