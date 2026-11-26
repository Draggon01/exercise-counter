package org.exercise.counter.exercisecounter.scheduler;

import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.junit.jupiter.api.Test;

import java.time.*;

import static org.junit.jupiter.api.Assertions.*;

/** Editing an exercise must not end its running period early. */
class KeepCurrentPeriodTest {

    private static final ZoneId VIENNA = ZoneId.of("Europe/Vienna");

    private static Instant vienna(String localDateTime) {
        return LocalDateTime.parse(localDateTime).atZone(VIENNA).toInstant();
    }

    private static LocalDateTime utc(String viennaLocal) {
        return LocalDateTime.ofInstant(vienna(viennaLocal), ZoneOffset.UTC);
    }

    private static SchedulerService schedulerAt(String viennaLocal) {
        return new SchedulerService(null, null, null, Clock.fixed(vienna(viennaLocal), VIENNA));
    }

    private static Exercise exercise(int daysRepeat, int hour) {
        Exercise exercise = new Exercise();
        exercise.setDaysRepeat(daysRepeat);
        exercise.setStartTime(LocalTime.of(hour, 0));
        exercise.setTimeZone(VIENNA.getId());
        exercise.setExerciseType(ExerciseType.NUMBERREPEAT);
        return exercise;
    }

    @Test
    void weeklyExercise_editedOnDayTwo_stillResetsAfterSevenDays() {
        SchedulerService scheduler = schedulerAt("2026-11-24T10:00");          // Tuesday
        Exercise edited = exercise(7, 8);

        scheduler.keepCurrentPeriod(edited, utc("2026-11-23T08:00"));          // last reset Monday

        assertEquals(utc("2026-11-23T08:00"), edited.getLastSchedulerRun());
        assertNull(edited.getResetNotBefore());
        assertEquals(vienna("2026-11-30T08:00"), scheduler.calculateNextRunInstant(edited));
    }

    @Test
    void moreDays_makeTheRunningPeriodLonger() {
        SchedulerService scheduler = schedulerAt("2026-11-24T10:00");
        Exercise edited = exercise(14, 8);

        scheduler.keepCurrentPeriod(edited, utc("2026-11-23T08:00"));

        assertEquals(vienna("2026-12-07T08:00"), scheduler.calculateNextRunInstant(edited));
    }

    @Test
    void newTime_appliesToTheEndOfTheRunningPeriod() {
        SchedulerService scheduler = schedulerAt("2026-11-24T10:00");
        Exercise edited = exercise(7, 20);

        scheduler.keepCurrentPeriod(edited, utc("2026-11-23T08:00"));

        assertEquals(vienna("2026-11-30T20:00"), scheduler.calculateNextRunInstant(edited));
    }

    @Test
    void periodAlreadyOverByTheNewSettings_endsAtTheNextResetTime_notRightAway() {
        SchedulerService scheduler = schedulerAt("2026-11-26T10:00");          // Thursday
        Exercise edited = exercise(2, 8);                                       // was weekly, last reset Monday

        scheduler.keepCurrentPeriod(edited, utc("2026-11-23T08:00"));

        assertEquals(vienna("2026-11-27T08:00"), edited.getResetNotBefore());
        assertEquals(vienna("2026-11-27T08:00"), scheduler.calculateNextRunInstant(edited));
    }

    @Test
    void earlierTimeOnTheDayOfTheReset_waitsForTheNextDay() {
        SchedulerService scheduler = schedulerAt("2026-11-24T10:00");
        Exercise edited = exercise(1, 9);                                       // was 12:00, last reset yesterday 12:00

        scheduler.keepCurrentPeriod(edited, utc("2026-11-23T12:00"));

        assertEquals(vienna("2026-11-25T09:00"), scheduler.calculateNextRunInstant(edited));
    }

    @Test
    void notBefore_survivesARestart_butNotAMissedReset() {
        Exercise edited = exercise(2, 8);
        schedulerAt("2026-11-26T10:00").keepCurrentPeriod(edited, utc("2026-11-23T08:00"));

        // restart before the planned reset: still waits for it
        assertEquals(vienna("2026-11-27T08:00"), schedulerAt("2026-11-26T18:00").calculateNextRunInstant(edited));
        // server was down past it: runs right away like any missed reset
        Instant later = vienna("2026-11-27T09:00");
        assertEquals(later.plusSeconds(1), schedulerAt("2026-11-27T09:00").calculateNextRunInstant(edited));
    }

    @Test
    void neverReset_usesTheNextResetTime() {
        SchedulerService scheduler = schedulerAt("2026-11-24T10:00");
        Exercise edited = exercise(7, 8);

        scheduler.keepCurrentPeriod(edited, null);

        assertNull(edited.getLastSchedulerRun());
        assertEquals(vienna("2026-11-25T08:00"), scheduler.calculateNextRunInstant(edited));
    }
}
