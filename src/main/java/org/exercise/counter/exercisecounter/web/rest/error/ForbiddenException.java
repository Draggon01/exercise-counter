package org.exercise.counter.exercisecounter.web.rest.error;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Thrown when the current user is not allowed to perform an action. Answered with 403.
 */
public class ForbiddenException extends ResponseStatusException {
    public ForbiddenException(String reason) {
        super(HttpStatus.FORBIDDEN, reason);
    }
}
