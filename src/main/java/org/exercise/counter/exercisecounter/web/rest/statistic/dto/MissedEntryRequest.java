package org.exercise.counter.exercisecounter.web.rest.statistic.dto;

import java.util.UUID;

/** Body of {@code POST /api/statistic/{exerciseId}/missed-entries}: the period the user finished. */
public record MissedEntryRequest(UUID periodId) {
}
