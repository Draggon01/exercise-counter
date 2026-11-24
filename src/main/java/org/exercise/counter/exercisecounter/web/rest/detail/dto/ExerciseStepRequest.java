package org.exercise.counter.exercisecounter.web.rest.detail.dto;

/** A new step, or all values of a changed one. */
public record ExerciseStepRequest(String title, String hints, Integer sets, Integer reps,
                                  Integer durationSeconds, Integer restSeconds) {
}
