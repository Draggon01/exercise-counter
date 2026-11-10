package org.exercise.counter.exercisecounter.web.rest.log.dto;

import java.util.UUID;

/** Progress of the current period: seconds for time exercises, reps otherwise. */
public record ExerciseLogRequest(UUID exerciseId, long value) {
}
