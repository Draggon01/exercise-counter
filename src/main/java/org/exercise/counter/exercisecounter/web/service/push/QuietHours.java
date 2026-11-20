package org.exercise.counter.exercisecounter.web.service.push;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Quiet hours of a user: no reminders from {@code from} (inclusive) to {@code until} (exclusive), full hours in
 * the user's time zone. {@code from > until} spans midnight (22 → 7). Reminders due in quiet hours are not lost:
 * the next run after the quiet hours sends them, as long as the exercise has not reset yet.
 */
public final class QuietHours {

    private QuietHours() {
    }

    public static boolean isValidHour(int hour) {
        return hour >= 0 && hour <= 23;
    }

    public static boolean isQuiet(int from, int until, String timeZone, Instant now) {
        int hour = now.atZone(zone(timeZone)).getHour();
        return from <= until
                ? hour >= from && hour < until
                : hour >= from || hour < until;
    }

    /** UTC for a missing or unknown zone. */
    public static ZoneId zone(String timeZone) {
        if (timeZone == null || timeZone.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(timeZone);
        } catch (DateTimeException e) {
            return ZoneOffset.UTC;
        }
    }
}
