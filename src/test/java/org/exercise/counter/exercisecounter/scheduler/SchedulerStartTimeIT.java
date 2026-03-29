package org.exercise.counter.exercisecounter.scheduler;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibiltiy;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SchedulerStartTimeIT {

    @Autowired
    private SchedulerService schedulerService;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private UserRepository userRepository;

    private Exercise testExercise;

    @BeforeEach
    void setup() {
        exerciseRepository.deleteAll();
        userRepository.deleteAll();

        User user = new User();
        user.setUsername("schedtestuser");
        user.setPassword("{bcrypt}abc123");
        userRepository.save(user);

        testExercise = new Exercise();
        testExercise.setExerciseTitle("Test");
        testExercise.setCreator("schedtestuser");
        testExercise.setDaysRepeat(1);
        testExercise.setStartTime(LocalTime.of(0, 0));
        testExercise.setUtcOffset(0);
        testExercise.setExerciseType(ExerciseType.NUMBERREPEAT);
        testExercise.setExerciseValue("10");
        testExercise.setVisibility(Visibiltiy.PUBLIC);
    }

    @Test
    void whenLastSchedulerRunIsNull_nextRunIsWithinOneRepeatPeriod() {
        testExercise.setDaysRepeat(1);
        testExercise.setLastSchedulerRun(null);
        testExercise = exerciseRepository.save(testExercise);

        Instant nextRun = schedulerService.calculateNextRunInstant(testExercise);

        assertTrue(nextRun.isAfter(Instant.now()), "Next run should be in the future");
        assertTrue(nextRun.isBefore(Instant.now().plusSeconds(86400 + 60)),
                "Next run should be within one repeat period");
    }

    @Test
    void whenLastSchedulerRunIsRecent_nextRunAccountsForRemainingDays() {
        // Last ran 1 day ago, daysRepeat=7 → next expected in 6 days
        testExercise.setDaysRepeat(7);
        testExercise.setLastSchedulerRun(LocalDateTime.now(ZoneId.of("UTC")).minusDays(1));
        testExercise = exerciseRepository.save(testExercise);

        Instant nextRun = schedulerService.calculateNextRunInstant(testExercise);

        long delaySeconds = nextRun.getEpochSecond() - Instant.now().getEpochSecond();
        long fiveDaysSeconds = 5L * 86400;
        long sevenDaysSeconds = 7L * 86400;

        assertTrue(delaySeconds > fiveDaysSeconds,
                "With 1 day elapsed of a 7-day cycle, next run should be ~6 days away, but was: " + delaySeconds + "s");
        assertTrue(delaySeconds < sevenDaysSeconds,
                "Next run should not exceed the full repeat period, but was: " + delaySeconds + "s");
    }

    @Test
    void whenLastSchedulerRunIsOverdue_nextRunIsImmediate() {
        // Last ran 5 days ago, daysRepeat=3 → overdue by 2 days
        testExercise.setDaysRepeat(3);
        testExercise.setLastSchedulerRun(LocalDateTime.now(ZoneId.of("UTC")).minusDays(5));
        testExercise = exerciseRepository.save(testExercise);

        Instant nextRun = schedulerService.calculateNextRunInstant(testExercise);

        long delaySeconds = nextRun.getEpochSecond() - Instant.now().getEpochSecond();
        assertTrue(delaySeconds <= 5,
                "Overdue exercise should be scheduled to run immediately, but delay was: " + delaySeconds + "s");
    }

    @Test
    void afterSchedulerFires_lastSchedulerRunIsPersisted() throws InterruptedException {
        testExercise.setDaysRepeat(1);
        testExercise.setLastSchedulerRun(null);
        testExercise = exerciseRepository.save(testExercise);

        schedulerService.restartSchedulerForExTest(testExercise);
        Thread.sleep(1500);

        Exercise updated = exerciseRepository.findById(testExercise.getExerciseId()).orElseThrow();
        assertNotNull(updated.getLastSchedulerRun(),
                "lastSchedulerRun should be set after the scheduler fires");
    }
}
