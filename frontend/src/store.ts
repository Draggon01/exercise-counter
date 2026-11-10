import {combineReducers, configureStore} from "@reduxjs/toolkit";
import {userReducer} from "./views/login/slice/userSlice";
import {exerciseReducer} from "./views/home/slice/exerciseSlice";
import {checkReducer} from "./views/home/slice/checkSlice";
import {statisticReducer} from "./views/statistics/slice/statisticSlice";
import {groupReducer} from "./views/groups/slice/groupSlice";
import {authReducer} from "./shared-slices/auth/authSlice";
import {authMiddleware} from "./shared-slices/auth/authMiddleware";
import {errorToastMiddleware} from "./shared-slices/notifications/errorToastMiddleware";
import {changelogMiddleware, changelogReducer} from "./shared-slices/changelog/changelogSlice";
import {optionsReducer} from "./views/options/slice/optionsSlice";
import {pushReducer} from "./views/options/slice/pushSlice";
import {registerReducer} from "./views/register/slice/registerSlice";

const rootReducer = combineReducers({
    user: userReducer,
    exercise: exerciseReducer,
    checks: checkReducer,
    statistic: statisticReducer,
    group: groupReducer,
    auth: authReducer,
    options: optionsReducer,
    push: pushReducer,
    register: registerReducer,
    changelog: changelogReducer
});

export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware => getDefaultMiddleware({
        immutableCheck: true,
        serializableCheck: true
    }).prepend(authMiddleware.middleware, errorToastMiddleware.middleware, changelogMiddleware.middleware)
});