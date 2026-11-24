package org.exercise.counter.exercisecounter.web.rest.detail.dto;

import java.util.UUID;

/** Reps or duration, not both; all numbers are optional. */
public record ExerciseStepDto(UUID stepId, String title, String hints, Integer sets, Integer reps,
                              Integer durationSeconds, Integer restSeconds) {
}
