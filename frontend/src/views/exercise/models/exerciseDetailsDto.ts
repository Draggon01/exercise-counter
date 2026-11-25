export type GuidedMode = "OFF" | "ORDERED" | "SHUFFLED";

export interface MediaDto {
    mediaId: string;
    kind: "VIDEO" | "PHOTO";
    status: "PROCESSING" | "READY" | "FAILED";
    /** why it FAILED */
    error: string | null;
    durationMs: number | null;
    width: number | null;
    height: number | null;
    hasAudio: boolean;
}

export interface MediaConfigDto {
    enabled: boolean;
    maxVideoBytes: number;
    maxPhotoBytes: number;
    maxSeconds: number;
}

export interface MediaUsageDto {
    usedBytes: number;
    quotaBytes: number;
}

/** A new or changed step; reps or duration, not both. */
export interface ExerciseStepRequest {
    title: string;
    hints: string;
    sets: number | null;
    reps: number | null;
    durationSeconds: number | null;
    restSeconds: number | null;
}

export interface ExerciseStepDto extends ExerciseStepRequest {
    stepId: string;
    /** its video or photo */
    media?: MediaDto | null;
}

export interface ExerciseDetailsDto {
    description: string;
    guidedMode: GuidedMode;
    steps: ExerciseStepDto[];
}
