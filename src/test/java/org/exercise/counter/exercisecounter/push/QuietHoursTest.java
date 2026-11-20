package org.exercise.counter.exercisecounter.push;

import org.exercise.counter.exercisecounter.web.service.push.QuietHours;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

class QuietHoursTest {

    private static Instant utc(int hour, int minute) {
        return Instant.parse("2026-11-20T00:00:00Z").atOffset(ZoneOffset.UTC).withHour(hour).withMinute(minute).toInstant();
    }

    @Test
    void spanningMidnight() {
        assertTrue(QuietHours.isQuiet(22, 7, "UTC", utc(22, 0)));
        assertTrue(QuietHours.isQuiet(22, 7, "UTC", utc(3, 30)));
        assertTrue(QuietHours.isQuiet(22, 7, "UTC", utc(6, 59)));
        assertFalse(QuietHours.isQuiet(22, 7, "UTC", utc(7, 0)));
        assertFalse(QuietHours.isQuiet(22, 7, "UTC", utc(21, 59)));
    }

    @Test
    void sameDay() {
        assertTrue(QuietHours.isQuiet(13, 15, "UTC", utc(14, 0)));
        assertFalse(QuietHours.isQuiet(13, 15, "UTC", utc(15, 0)));
        assertFalse(QuietHours.isQuiet(13, 15, "UTC", utc(12, 59)));
    }

    @Test
    void usesTheUsersTimeZone() {
        // 21:30 UTC is 22:30 in Vienna (winter time)
        assertTrue(QuietHours.isQuiet(22, 7, "Europe/Vienna", utc(21, 30)));
        assertFalse(QuietHours.isQuiet(22, 7, "UTC", utc(21, 30)));
    }

    @Test
    void unknownZone_isUtc() {
        assertTrue(QuietHours.isQuiet(22, 7, null, utc(23, 0)));
        assertTrue(QuietHours.isQuiet(22, 7, "Not/AZone", utc(23, 0)));
    }
}
