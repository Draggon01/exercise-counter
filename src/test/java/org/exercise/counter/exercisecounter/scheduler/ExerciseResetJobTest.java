package org.exercise.counter.exercisecounter.scheduler;

import io.hypersistence.utils.hibernate.type.range.Range;
import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLog;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogId;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.scheduler.ExerciseResetJob;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ExerciseResetJobTest {

    private static final String USERNAME = "resetjobuser";

    @Autowired private ExerciseResetJob exerciseResetJob;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private CheckRepository checkRepository;
    @Autowired private ExerciseLogRepository exerciseLogRepository;
    @Autowired private PeriodRepository periodRepository;
    @Autowired private FinishedUserRepository finishedUserRepository;
    @Autowired private UserRepository userRepository;

    private Exercise exercise;

    @BeforeEach
    void setup() {
        finishedUserRepository.deleteAll();
        periodRepository.deleteAll();
        checkRepository.deleteAll();
        exerciseLogRepository.deleteAll();
        if (userRepository.findByUsername(USERNAME).isEmpty()) {
            userRepository.save(new User(USERNAME, "{noop}x"));
        }

        exercise = new Exercise();
        exercise.setExerciseTitle("Reset");
        exercise.setCreator(USERNAME);
        exercise.setDaysRepeat(1);
        exercise.setStartTime(LocalTime.of(0, 0));
        exercise.setUtcOffset(2);
        exercise.setExerciseType(ExerciseType.NUMBERINCREASE);
        exercise.setExerciseValue("10");
        exercise.setExerciseIncrease("5");
        exercise.setVisibility(Visibility.PUBLIC);
        exercise = exerciseRepository.save(exercise);
    }

    @AfterEach
    void cleanup() {
        checkRepository.deleteAll();
        exerciseLogRepository.deleteAll();
        exerciseRepository.deleteById(exercise.getExerciseId()); // cascades to periods + finished users
    }

    @Test
    void run_closesPeriod_clearsChecksAndLogs_andIncreasesValue() {
        UUID id = exercise.getExerciseId();
        checkRepository.save(new Check(new CheckId(id, USERNAME)));
        exerciseLogRepository.save(new ExerciseLog(new ExerciseLogId(id, USERNAME), 7L, LocalDateTime.now()));

        exerciseResetJob.run(id);

        Exercise updated = exerciseRepository.findById(id).orElseThrow();
        assertEquals("15", updated.getExerciseValue());
        assertNotNull(updated.getLastSchedulerRun());
        assertTrue(checkRepository.findCheckByCheckIdExerciseId(id).isEmpty());
        assertTrue(exerciseLogRepository.findByLogIdExerciseId(id).isEmpty());

        List<Period> periods = periodRepository.findByExerciseExerciseId(id);
        assertEquals(1, periods.size());
        assertEquals(List.of(USERNAME), finishedUserRepository.findByPeriod_PeriodId(periods.getFirst().getPeriodId())
                .stream().map(fu -> fu.getUsername().getUsername()).toList());
    }

    @Test
    void run_repeatTypeDoesNotChangeValue() {
        exercise.setExerciseType(ExerciseType.NUMBERREPEAT);
        exercise = exerciseRepository.save(exercise);

        exerciseResetJob.run(exercise.getExerciseId());

        assertEquals("10", exerciseRepository.findById(exercise.getExerciseId()).orElseThrow().getExerciseValue());
    }

    @Test
    void run_storesNonEmptyRangeInExerciseLocalTime() {
        LocalDateTime before = LocalDateTime.now(ZoneOffset.UTC).plusHours(2).minusSeconds(1);

        exerciseResetJob.run(exercise.getExerciseId());

        Range<LocalDateTime> range = periodRepository.findByExerciseExerciseId(exercise.getExerciseId())
                .getFirst().getTimeRange();
        assertTrue(range.upper().isAfter(before), "end should be now in exercise-local time (UTC+2)");
        assertTrue(range.lower().isBefore(range.upper()), "range must not be empty/zero-width");
    }

    @Test
    void consecutiveRuns_doNotOverlap_evenWithLegacyPointPeriods() {
        // legacy rows are zero-width points; put one "in the future" relative to lastSchedulerRun
        LocalDateTime nowLocal = LocalDateTime.now(ZoneOffset.UTC).plusHours(2);
        Period legacy = new Period();
        legacy.setExercise(exercise);
        legacy.setTimeRange(Range.closed(nowLocal.minusHours(1), nowLocal.minusHours(1)));
        periodRepository.save(legacy);
        exercise.setLastSchedulerRun(LocalDateTime.now(ZoneOffset.UTC).minusDays(1));
        exercise = exerciseRepository.save(exercise);

        // would violate the EXCLUDE constraint if the new range overlapped the legacy point
        exerciseResetJob.run(exercise.getExerciseId());
        exerciseResetJob.run(exercise.getExerciseId());

        List<Period> periods = periodRepository.findByExerciseExerciseId(exercise.getExerciseId()).stream()
                .sorted(Comparator.comparing(p -> p.getTimeRange().upper()))
                .toList();
        assertEquals(3, periods.size());
    }

    @Test
    void run_forDeletedExercise_doesNothing() {
        assertDoesNotThrow(() -> exerciseResetJob.run(UUID.randomUUID()));
    }
}
