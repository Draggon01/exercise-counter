package org.exercise.counter.exercisecounter.web.rest.user.dto;

import java.util.UUID;

/** Body of the invite link validity check. */
public record RegisterIdRequest(UUID registerId) {
}
