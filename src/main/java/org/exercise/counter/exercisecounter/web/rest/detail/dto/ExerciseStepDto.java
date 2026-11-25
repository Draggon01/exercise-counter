package org.exercise.counter.exercisecounter.web.rest.detail.dto;

import org.exercise.counter.exercisecounter.web.rest.media.dto.MediaDto;

import java.util.UUID;

/** Reps or duration, not both; all numbers are optional. {@code media}: its video or photo, or null. */
public record ExerciseStepDto(UUID stepId, String title, String hints, Integer sets, Integer reps,
                              Integer durationSeconds, Integer restSeconds, MediaDto media) {
}
