package org.exercise.counter.exercisecounter.web.rest.media.dto;

/** What can be uploaded. */
public record MediaConfigDto(boolean enabled, long maxVideoBytes, long maxPhotoBytes, int maxSeconds) {
}
