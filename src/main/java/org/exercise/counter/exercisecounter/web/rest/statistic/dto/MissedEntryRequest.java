package org.exercise.counter.exercisecounter.web.rest.statistic.dto;

/**
 * Body of {@code POST /api/statistic/{exerciseId}/missed-entries}: the period the user finished but forgot
 * to mark – given by the day it closed ({@code YYYY-MM-DD}, as in the statistics).
 */
public record MissedEntryRequest(String date) {
}
