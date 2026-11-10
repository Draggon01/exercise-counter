export interface StatisticDto {
    finishedInformation: Record<string, string[]>
    /** Users who currently have the exercise on their home page. */
    participants?: string[]
}