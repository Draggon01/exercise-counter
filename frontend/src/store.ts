import {combineReducers, configureStore} from "@reduxjs/toolkit";
import {userReducer} from "./views/login/slice/userSlice";
import {exerciseReducer} from "./views/home/slice/exerciseSlice";
import {checkReducer} from "./views/home/slice/checkSlice";
import {statisticReducer} from "./views/statistics/slice/statisticSlice";
import {groupReducer} from "./views/groups/slice/groupSlice";
import {authReducer} from "./othrSlices/auth/authSlice";
import {authMiddleware} from "./othrSlices/auth/authMiddleware";

const rootReducer = combineReducers({
    user: userReducer,
    exercise: exerciseReducer,
    checks: checkReducer,
    statistic: statisticReducer,
    group: groupReducer,
    auth: authReducer
});

export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware => getDefaultMiddleware({
        immutableCheck: true,
        serializableCheck: true
    }).prepend(authMiddleware.middleware)
});