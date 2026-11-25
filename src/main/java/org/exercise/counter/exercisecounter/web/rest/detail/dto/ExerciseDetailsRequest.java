package org.exercise.counter.exercisecounter.web.rest.detail.dto;

import org.exercise.counter.exercisecounter.web.data.detail.GuidedMode;

/** Only the fields that are set are changed (null = keep). */
public record ExerciseDetailsRequest(String description, GuidedMode guidedMode, Integer getReadySeconds) {
}
