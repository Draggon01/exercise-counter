import {createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../../commons";
import {apiDelete, apiGet, apiPost, apiPut, apiThunk} from "../../../api/http";
import {deleteExercise, unselectExercise} from "../../home/slice/exerciseSlice";
import {base64UrlToBytes, currentPushEnvironment, PushSupport, pushStep, pushSupport} from "../../../utils/push";

/**
 * Reminders by push notification on this device: whether the server offers them, what the browser can
 * do and whether this device is subscribed. The subscription itself lives in the browser (service worker);
 * the backend stores it to send reminders (see ReminderService).
 */
type PushConfigDto = { enabled: boolean, publicKey: string | null };

export type PushState = {
    status: AsyncStoreState;
    /** the server has VAPID keys configured */
    serverEnabled: boolean;
    publicKey: string | null;
    support: PushSupport;
    /** a service worker is registered (production build) – needed to receive pushes */
    serviceWorker: boolean;
    subscribed: boolean;
    permission: NotificationPermission | "unknown";
    /** switching on/off is in progress */
    busy: boolean;
    /** exercises of the home list the user gets reminders for (all devices) */
    reminders: string[];
    /** reminders have been loaded */
    remindersLoaded: boolean;
};

type SliceProjection = { push: PushState };

const initialState: PushState = {
    status: "initial",
    serverEnabled: false,
    publicKey: null,
    support: "unsupported",
    serviceWorker: false,
    subscribed: false,
    permission: "unknown",
    busy: false,
    reminders: [],
    remindersLoaded: false,
};

const SUBSCRIPTIONS = "/api/push/subscriptions";

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
    return "serviceWorker" in navigator ? navigator.serviceWorker.getRegistration() : undefined;
}

export const loadPushState = apiThunk<Omit<PushState, "status" | "busy" | "reminders" | "remindersLoaded">>('push/load', async () => {
    const config = await apiGet<PushConfigDto>("/api/push/config");
    const support = pushSupport(currentPushEnvironment());
    const permission = "Notification" in window ? Notification.permission : "unknown";
    const reg = support === "supported" ? await registration() : undefined;
    const subscription = reg ? await reg.pushManager.getSubscription() : null;
    if (subscription && config.enabled) {
        // keeps the server in sync, e.g. after another user logged in on this device
        await apiPut(SUBSCRIPTIONS, subscription.toJSON());
    }
    return {
        serverEnabled: config.enabled, publicKey: config.publicKey, support,
        serviceWorker: !!reg, subscribed: !!subscription, permission,
    };
});

export const enableReminders = apiThunk<NotificationPermission, string>('push/enable', async publicKey => {
    // every browser step names itself in the error toast and cannot hang the switch forever
    const permission = await pushStep("Asking for permission", Notification.requestPermission());
    if (permission !== "granted") {
        throw new Error("Notifications are blocked – allow them for this site in your browser settings");
    }
    const reg = await pushStep("Finding the service worker", registration());
    if (!reg) {
        throw new Error("Reminders only work in the installed app");
    }
    // a subscription made with an older server key cannot be reused
    const old = await pushStep("Reading the old subscription", reg.pushManager.getSubscription());
    if (old) {
        await pushStep("Removing the old subscription", old.unsubscribe()).catch(e => console.warn(e));
    }
    const subscription = await pushStep("Subscribing at the push service", reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
    }));
    try {
        await apiPut(SUBSCRIPTIONS, subscription.toJSON());
    } catch (e) {
        await subscription.unsubscribe(); // the server does not know it – do not leave it half on
        throw e;
    }
    return permission;
});

export const disableReminders = apiThunk<void>('push/disable', async () => {
    const subscription = await (await registration())?.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await apiDelete(`${SUBSCRIPTIONS}?endpoint=${encodeURIComponent(endpoint)}`);
});

export const sendTestReminder = apiThunk<{ delivered: number }>(
    'push/test', () => apiPost("/api/push/test"));

/** Which exercises the user gets reminders for. */
export const loadReminders = apiThunk<string[]>('push/reminders', () => apiGet("/api/push/reminders"));

export type ReminderChange = { exerciseId: string, on: boolean };

/** Turns the reminder of one exercise on or off. */
export const setExerciseReminder = apiThunk<ReminderChange, ReminderChange>('push/reminder', async change => {
    const url = `/api/push/reminders/${change.exerciseId}`;
    await (change.on ? apiPut(url) : apiDelete(url));
    return change;
});

const pushSlice = createSlice({
    name: "push",
    initialState,
    reducers: {},
    extraReducers: builder => {
        builder
            .addCase(loadPushState.pending, state => {
                state.status = "loading";
            })
            .addCase(loadPushState.fulfilled, (state, action) => {
                return {...state, ...action.payload, status: "idle"};
            })
            .addCase(loadPushState.rejected, state => {
                state.status = "error";
            })
            .addCase(enableReminders.pending, state => {
                state.busy = true;
            })
            .addCase(enableReminders.fulfilled, (state, action) => {
                state.busy = false;
                state.subscribed = true;
                state.permission = action.payload;
            })
            .addCase(enableReminders.rejected, state => {
                state.busy = false;
                state.subscribed = false;
                state.permission = "Notification" in window ? Notification.permission : "unknown";
            })
            .addCase(disableReminders.pending, state => {
                state.busy = true;
            })
            .addCase(disableReminders.fulfilled, state => {
                state.busy = false;
                state.subscribed = false;
            })
            .addCase(disableReminders.rejected, state => {
                state.busy = false;
            })
            .addCase(loadReminders.fulfilled, (state, action) => {
                state.reminders = action.payload;
                state.remindersLoaded = true;
            })
            // hidden or deleted exercises lose their reminder (the server removes the home list entry)
            .addCase(unselectExercise.fulfilled, (state, action) => {
                state.reminders = state.reminders.filter(id => id !== action.payload);
            })
            .addCase(deleteExercise.fulfilled, (state, action) => {
                state.reminders = state.reminders.filter(id => id !== action.payload.exerciseId);
            })
            .addCase(setExerciseReminder.fulfilled, (state, action) => {
                const {exerciseId, on} = action.payload;
                state.reminders = state.reminders.filter(id => id !== exerciseId);
                if (on) state.reminders.push(exerciseId);
            });
    },
});

export const pushReducer: Reducer<PushState> = pushSlice.reducer;

export const selectPush = (state: SliceProjection) => state.push;

/** Reminders can be chosen per exercise: the server offers them and this device gets them. */
export const selectCanChooseReminders = (state: SliceProjection) =>
    state.push.status === "idle" && state.push.serverEnabled && state.push.subscribed;

export const selectReminders = (state: SliceProjection) => state.push.reminders;
