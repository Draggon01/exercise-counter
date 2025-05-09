package org.exercise.counter.exercisecounter.web.rest.statistic.dto;

import java.util.List;
import java.util.Map;

public record StatisticDto(
        Map<String, List<String>> finishedInformation
) {
}
