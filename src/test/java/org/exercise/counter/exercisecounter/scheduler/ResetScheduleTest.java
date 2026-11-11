package org.exercise.counter.exercisecounter.scheduler;

import org.exercise.counter.exercisecounter.web.scheduler.ResetSchedule;
import org.junit.jupiter.api.Test;

import java.time.*;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ResetScheduleTest {

    private static final ZoneId VIENNA = ZoneId.of("Europe/Vienna");
    private static final LocalTime EIGHT_PM = LocalTime.of(20, 0);

    private static Instant vienna(String localDateTime) {
        return LocalDateTime.parse(localDateTime).atZone(VIENNA).toInstant();
    }

    private static LocalDateTime utc(Instant instant) {
        return LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    @Test
    void firstRun_isTodayIfStillAhead() {
        assertEquals(vienna("2026-11-11T20:00"),
                ResetSchedule.nextRun(EIGHT_PM, VIENNA, 1, null, vienna("2026-11-11T15:00")));
    }

    @Test
    void firstRun_isTomorrowIfTodaysTimeIsOver() {
        assertEquals(vienna("2026-11-12T20:00"),
                ResetSchedule.nextRun(EIGHT_PM, VIENNA, 1, null, vienna("2026-11-11T21:00")));
    }

    @Test
    void staysAtEightPm_whenSummerTimeEnds() {
        // last reset Sat 24 Oct 20:00 (UTC+2), clocks go back on Sunday 25 Oct
        Instant last = vienna("2026-10-24T20:00");
        Instant next = ResetSchedule.nextRun(EIGHT_PM, VIENNA, 1, utc(last), last.plusSeconds(1));

        assertEquals(vienna("2026-10-25T20:00"), next);
        assertEquals(Duration.ofHours(25), Duration.between(last, next), "that day has 25 hours");
    }

    @Test
    void staysAtEightPm_whenSummerTimeStarts() {
        Instant last = vienna("2026-03-28T20:00");
        Instant next = ResetSchedule.nextRun(EIGHT_PM, VIENNA, 1, utc(last), last.plusSeconds(1));

        assertEquals(vienna("2026-03-29T20:00"), next);
        assertEquals(Duration.ofHours(23), Duration.between(last, next), "that day has 23 hours");
    }

    @Test
    void everyFewDays_countsCalendarDays() {
        Instant last = vienna("2026-10-20T20:00");
        assertEquals(vienna("2026-10-27T20:00"),
                ResetSchedule.nextRun(EIGHT_PM, VIENNA, 7, utc(last), vienna("2026-10-22T10:00")));
    }

    @Test
    void overdue_runsRightAway() {
        Instant now = vienna("2026-11-11T10:00");
        assertEquals(now.plusSeconds(1),
                ResetSchedule.nextRun(EIGHT_PM, VIENNA, 1, utc(vienna("2026-11-08T20:00")), now));
    }

    @Test
    void timeThatDoesNotExistOnTheSwitchDay_movesForward() {
        // 02:30 does not exist on 29 March 2026 in Vienna (02:00 → 03:00)
        Instant last = vienna("2026-03-28T02:30");
        assertEquals(vienna("2026-03-29T03:30"),
                ResetSchedule.nextRun(LocalTime.of(2, 30), VIENNA, 1, utc(last), last.plusSeconds(1)));
    }

    @Test
    void fixedOffset_ofOldExercises_keepsWorking() {
        ZoneOffset plusTwo = ZoneOffset.ofHours(2);
        Instant now = Instant.parse("2026-11-11T10:00:00Z");
        assertEquals(Instant.parse("2026-11-11T18:00:00Z"), ResetSchedule.nextRun(EIGHT_PM, plusTwo, 1, null, now));
    }
}
