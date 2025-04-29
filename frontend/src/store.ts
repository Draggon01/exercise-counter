import {combineReducers, configureStore} from "@reduxjs/toolkit";
import {userReducer} from "./views/login/slice/userSlice";
import {exerciseReducer} from "./views/home/slice/exerciseSlice";

const rootReducer = combineReducers({
    user: userReducer,
    exercise: exerciseReducer
});

export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware => getDefaultMiddleware({
        immutableCheck: true,
        serializableCheck: true
    })
});