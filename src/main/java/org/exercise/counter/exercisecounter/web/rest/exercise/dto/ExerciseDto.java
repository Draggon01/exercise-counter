package org.exercise.counter.exercisecounter.web.rest.exercise.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record ExerciseDto(
        @JsonProperty("exerciseId")
        UUID exerciseId,
        @JsonProperty("exerciseTitle")
        String exerciseTitle
) {
}
