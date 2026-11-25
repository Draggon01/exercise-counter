package org.exercise.counter.exercisecounter.web.rest.media.dto;

import org.exercise.counter.exercisecounter.web.data.media.MediaKind;
import org.exercise.counter.exercisecounter.web.data.media.MediaStatus;

import java.util.UUID;

/** Video or photo of a step; size and duration are set once it is READY, the error if it FAILED. */
public record MediaDto(UUID mediaId, MediaKind kind, MediaStatus status, String error, Integer durationMs,
                       Integer width, Integer height, boolean hasAudio) {
}
