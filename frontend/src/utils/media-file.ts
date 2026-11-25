/** Checks of a video or photo before it is uploaded. */

export interface MediaLimits {
    maxVideoBytes: number;
    maxPhotoBytes: number;
    maxSeconds: number;
}

export const formatMegabytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb < 10 && mb % 1 !== 0 ? mb.toFixed(1) : Math.round(mb)} MB`;
};

/** Why the file cannot be used; undefined if it looks fine (the server decides). Unknown length: undefined. */
export function mediaProblem(file: { type: string, size: number }, seconds: number | undefined, limits: MediaLimits): string | undefined {
    if (/^image\/(heic|heif|avif)/.test(file.type)) {
        return "HEIC photos are not supported – please choose a JPEG";
    }
    if (file.type && !/^(image|video)\//.test(file.type)) {
        return "Please choose a video or a photo";
    }
    const max = file.type.startsWith("image/") ? limits.maxPhotoBytes : limits.maxVideoBytes;
    if (file.size > max) {
        return `The file is too large (${formatMegabytes(file.size)}, at most ${formatMegabytes(max)})`;
    }
    if (seconds !== undefined && seconds > limits.maxSeconds + 1) {
        return `The video is ${Math.round(seconds)} seconds long, at most ${limits.maxSeconds} are possible`;
    }
    return undefined;
}

/** Length of a video file; undefined if the browser cannot tell (within 3 s). */
export function videoSeconds(file: File): Promise<number | undefined> {
    if (!file.type.startsWith("video/")) return Promise.resolve(undefined);
    return new Promise(resolve => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(file);
        const finish = (seconds?: number) => {
            clearTimeout(timeout);
            video.removeAttribute("src");
            URL.revokeObjectURL(url);
            resolve(seconds !== undefined && Number.isFinite(seconds) ? seconds : undefined);
        };
        const timeout = setTimeout(() => finish(), 3000);
        video.preload = "metadata";
        video.onloadedmetadata = () => finish(video.duration);
        video.onerror = () => finish();
        video.src = url;
    });
}
