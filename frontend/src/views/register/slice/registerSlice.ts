import {AsyncStoreState} from "../../../commons";
import {createSlice, Reducer} from "@reduxjs/toolkit";
import {apiGet, apiThunk} from "../../../api/http";

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

export const validateRegisterId = apiThunk<boolean, string>(
    'register/validateId', registerId => apiGet(`/api/public/invites/${encodeURIComponent(registerId)}/valid`));

/** true if nobody uses the username yet. */
export const checkUsernameAvailable = apiThunk<boolean, string>(
    'register/checkUsername', username => apiGet(`/api/public/username-available?username=${encodeURIComponent(username)}`));

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
