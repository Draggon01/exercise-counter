export interface ExerciseDto {
    exerciseId: string;
    exerciseTitle: string;
    creator: string;
    daysRepeat: number;
    startTime: string;
    utcOffset: number;
    /** IANA time zone of startTime, e.g. Europe/Vienna (null for exercises from before zones were stored) */
    timeZone?: string | null;
    exerciseType: string;
    exerciseValue: string;
    exerciseIncrease: string;
    visibility: string;
    groups?: string[];
    timeLeftSeconds?: number;
    position?: number;
}