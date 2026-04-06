export interface ExerciseDto {
    exerciseId: string;
    exerciseTitle: string;
    creator: string;
    daysRepeat: number;
    startTime: string;
    utcOffset: number;
    exerciseType: string;
    exerciseValue: string;
    exerciseIncrease: string;
    visibility: string;
    groups?: string[];
    timeLeftSeconds?: number;
    sortOrder?: number;
}