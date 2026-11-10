package org.exercise.counter.exercisecounter.web.rest.error;

/**
 * JSON body of every error response: {@code {"error": "..."}}.
 */
public record ErrorDto(String error) {
}
