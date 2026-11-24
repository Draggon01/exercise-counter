package org.exercise.counter.exercisecounter.web.rest.detail.dto;

import org.exercise.counter.exercisecounter.web.data.detail.GuidedMode;

import java.util.List;

/** Description (empty if none) and steps of an exercise, in order. */
public record ExerciseDetailsDto(String description, GuidedMode guidedMode, List<ExerciseStepDto> steps) {
}
