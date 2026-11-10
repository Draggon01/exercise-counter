package org.exercise.counter.exercisecounter.web.rest.statistic.dto;

import java.util.List;
import java.util.Map;

/**
 * @param finishedInformation finishers per period (key "YYYY-MM-DD:YYYY-MM-DD") plus "current"
 * @param participants        users who currently have the exercise on their home page
 */
public record StatisticDto(
        Map<String, List<String>> finishedInformation,
        List<String> participants
) {
}
