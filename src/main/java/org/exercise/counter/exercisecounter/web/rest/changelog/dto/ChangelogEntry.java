package org.exercise.counter.exercisecounter.web.rest.changelog.dto;

import java.util.List;

/**
 * One release in {@code src/main/resources/changelog.json} (newest first).
 *
 * @param date display date, e.g. {@code 2026-11-10} (older entries only have a year)
 */
public record ChangelogEntry(String version, String date, String title, List<String> items) {
}
