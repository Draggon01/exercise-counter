package org.exercise.counter.exercisecounter.web.rest.groups.dto;

import java.util.List;
import java.util.UUID;

public record ExerciseGroupMappingDto(
        UUID exerciseId,
        List<String> groupNames
) {
}
