package org.exercise.counter.exercisecounter.web.scheduler;

import java.time.*;

/**
 * When an exercise resets: every {@code daysRepeat} days at {@code resetTime} in the exercise's time zone.
 * Calculated on the calendar of that zone, so the reset stays at the same clock time across daylight
 * saving time changes (a fixed 24h rhythm would move it by an hour twice a year).
 */
public final class ResetSchedule {

    private ResetSchedule() {
    }

    /**
     * @param lastRunUtc last reset (UTC), null if the exercise never reset → the next occurrence of the time
     * @return the next reset; {@code now} (+1 second) if it is overdue (e.g. the server was down)
     */
    public static Instant nextRun(LocalTime resetTime, ZoneId zone, int daysRepeat, LocalDateTime lastRunUtc, Instant now) {
        if (lastRunUtc == null) {
            LocalDate today = now.atZone(zone).toLocalDate();
            Instant candidate = ZonedDateTime.of(today, resetTime, zone).toInstant();
            return candidate.isAfter(now) ? candidate : ZonedDateTime.of(today.plusDays(1), resetTime, zone).toInstant();
        }
        LocalDate lastRunDay = lastRunUtc.atZone(ZoneOffset.UTC).withZoneSameInstant(zone).toLocalDate();
        Instant next = ZonedDateTime.of(lastRunDay.plusDays(Math.max(1, daysRepeat)), resetTime, zone).toInstant();
        return next.isAfter(now) ? next : now.plusSeconds(1);
    }
}
