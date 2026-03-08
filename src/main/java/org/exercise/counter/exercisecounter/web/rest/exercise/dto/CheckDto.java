package org.exercise.counter.exercisecounter.web.rest.exercise.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record CheckDto(
        @JsonProperty("exerciseId")
        UUID exerciseId,
        @JsonProperty("user")
        String user,
        @JsonProperty("streak")
        Integer streak
) {
}
