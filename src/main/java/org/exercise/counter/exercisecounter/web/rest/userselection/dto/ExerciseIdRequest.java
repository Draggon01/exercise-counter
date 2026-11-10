package org.exercise.counter.exercisecounter.web.rest.userselection.dto;

import java.util.UUID;

/** Body of select / unselect: {@code {"exerciseId": "…"}}. */
public record ExerciseIdRequest(UUID exerciseId) {
}
