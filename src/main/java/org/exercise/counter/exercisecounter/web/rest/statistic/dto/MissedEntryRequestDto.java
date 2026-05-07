package org.exercise.counter.exercisecounter.web.rest.statistic.dto;

import java.util.UUID;

public record MissedEntryRequestDto(UUID exerciseId, UUID periodId) {
}
