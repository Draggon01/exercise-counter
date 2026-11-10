package org.exercise.counter.exercisecounter.web.rest.log.dto;

/** Progress of the current period: seconds for time exercises, reps otherwise. */
public record ExerciseLogRequest(long value) {
}
