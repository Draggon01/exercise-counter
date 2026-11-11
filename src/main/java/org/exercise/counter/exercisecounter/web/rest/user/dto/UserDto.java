package org.exercise.counter.exercisecounter.web.rest.user.dto;

public record UserDto(
        String username, Boolean anonymous,
        /* may create password reset links (app.admins) */
        Boolean admin
) {
}
