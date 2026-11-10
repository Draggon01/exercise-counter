package org.exercise.counter.exercisecounter.web.data.statistic;

import java.util.UUID;

/**
 * Projection: {@code username} finished period {@code periodId} of exercise {@code exerciseId}.
 */
public record PeriodFinisher(UUID exerciseId, UUID periodId, String username) {
}
