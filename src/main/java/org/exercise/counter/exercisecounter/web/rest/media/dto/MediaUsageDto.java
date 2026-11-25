package org.exercise.counter.exercisecounter.web.rest.media.dto;

/** Finished files of all exercises of the user. */
public record MediaUsageDto(long usedBytes, long quotaBytes) {
}
