package org.exercise.counter.exercisecounter.web.rest.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public record RegisterDto(
        @JsonProperty("username") String username,
        @JsonProperty("password") String password,
        @JsonProperty("registerId") UUID registerId
) {
}
