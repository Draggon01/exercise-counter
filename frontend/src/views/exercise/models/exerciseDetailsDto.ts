export type GuidedMode = "OFF" | "ORDERED" | "SHUFFLED";

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
}

export interface ExerciseDetailsDto {
    description: string;
    guidedMode: GuidedMode;
    steps: ExerciseStepDto[];
}
