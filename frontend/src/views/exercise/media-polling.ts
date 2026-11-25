import type {ReactiveController, ReactiveControllerHost} from "lit";
import {store} from "../../store";
import {ExerciseDetailsDto} from "./models/exerciseDetailsDto";
import {refreshMedia} from "./slice/exerciseDetailSlice";

const INTERVAL_MS = 2000;

/** A video or photo is still converted on the server. */
export const hasPendingMedia = (details?: ExerciseDetailsDto) =>
    details?.steps.some(step => step.media?.status === "PROCESSING") ?? false;

/** Looks every 2 s whether videos and photos are ready, only while one is converted and the page is visible. */
export class MediaPolling implements ReactiveController {

    private exerciseId = "";
    private interval?: ReturnType<typeof setInterval>;

    /** @param finished called when nothing is converted any more */
    constructor(host: ReactiveControllerHost, private readonly finished: () => void = () => undefined) {
        host.addController(this);
    }

    update(exerciseId: string, pending: boolean) {
        this.exerciseId = exerciseId;
        if (pending && !this.interval) {
            this.interval = setInterval(this.load, INTERVAL_MS);
        } else if (!pending && this.interval) {
            this.stop();
            queueMicrotask(this.finished); // not while the store notifies its listeners
        }
    }

    hostDisconnected() {
        this.stop();
    }

    private load = () => {
        if (document.visibilityState === "visible") store.dispatch(refreshMedia(this.exerciseId));
    }

    private stop() {
        clearInterval(this.interval);
        this.interval = undefined;
    }
}
