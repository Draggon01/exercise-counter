import {createSlice, Reducer} from "@reduxjs/toolkit";
import {AsyncStoreState} from "../../../commons";
import {apiDelete, apiGet, apiPost, apiPut, apiThunk} from "../../../api/http";
import {base64UrlToBytes, currentPushEnvironment, PushSupport, pushSupport} from "../../../utils/push";

/**
 * Reminders by push notification on this device: whether the server offers them, what the browser can
 * do and whether this device is subscribed. The subscription itself lives in the browser (service worker);
 * the backend stores it to send reminders (see ReminderService).
 */
type PushConfigDto = { enabled: boolean, publicKey: string | null };

type PushState = {
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
};

const SUBSCRIPTIONS = "/api/push/subscriptions";

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
    return "serviceWorker" in navigator ? navigator.serviceWorker.getRegistration() : undefined;
}

export const loadPushState = apiThunk<Omit<PushState, "status" | "busy">>('push/load', async () => {
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
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        throw new Error("Notifications are blocked – allow them for this site in your browser settings");
    }
    const reg = await registration();
    if (!reg) {
        throw new Error("Reminders only work in the installed app");
    }
    // a subscription made with an older server key cannot be reused
    await (await reg.pushManager.getSubscription())?.unsubscribe();
    const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(publicKey),
    });
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
            });
    },
});

export const pushReducer: Reducer<PushState> = pushSlice.reducer;

export const selectPush = (state: SliceProjection) => state.push;
