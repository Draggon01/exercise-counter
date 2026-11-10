package org.exercise.counter.exercisecounter.check;

import io.hypersistence.utils.hibernate.type.range.Range;
import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUser;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.check.dto.CheckDto;
import org.exercise.counter.exercisecounter.web.service.CheckService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class CheckServiceTest {

    private static final String ANNA = "chk-anna";
    private static final String BEN = "chk-ben";

    @Autowired private CheckService checkService;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private PeriodRepository periodRepository;
    @Autowired private FinishedUserRepository finishedUserRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private UserSelectionRepository userSelectionRepository;

    private Exercise exercise;

    @BeforeEach
    void setup() {
        for (String name : List.of(ANNA, BEN)) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}x"));
            }
        }
        exercise = new Exercise();
        exercise.setExerciseTitle("Streaks");
        exercise.setCreator(ANNA);
        exercise.setDaysRepeat(1);
        exercise.setStartTime(LocalTime.NOON);
        exercise.setUtcOffset(0);
        exercise.setExerciseType(ExerciseType.NUMBERREPEAT);
        exercise.setExerciseValue("1");
        exercise.setVisibility(Visibility.PUBLIC);
        exercise = exerciseRepository.save(exercise);
    }

    @AfterEach
    void cleanup() {
        exerciseRepository.delete(exercise); // cascades periods, finished users, checks, selections
    }

    @Test
    void streak_withoutHistory_isOne() {
        assertEquals(1, checkService.streak(exercise.getExerciseId(), ANNA));
    }

    @Test
    void streak_countsConsecutiveFinishedPeriods_newestFirst() {
        // oldest -> newest: finished, missed, finished, finished
        period(4, ANNA);
        period(3);
        period(2, ANNA);
        period(1, ANNA, BEN);

        assertEquals(3, checkService.streak(exercise.getExerciseId(), ANNA)); // current + 2
        assertEquals(2, checkService.streak(exercise.getExerciseId(), BEN));  // current + 1
    }

    @Test
    void listPerSelectedExercise_containsCheckersWithStreak() {
        userSelectionRepository.save(new UserSelection(new UserSelectionId(ANNA, exercise.getExerciseId()), 0));
        period(1, BEN);
        checkService.check(exercise.getExerciseId(), BEN);

        Map<UUID, List<CheckDto>> result = checkService.listPerSelectedExercise(ANNA);

        assertEquals(List.of(new CheckDto(exercise.getExerciseId(), BEN, 2)), result.get(exercise.getExerciseId()));
    }

    @Test
    void checkAndUncheck() {
        checkService.check(exercise.getExerciseId(), ANNA);
        assertEquals(1, checkService.listForUser(ANNA).size());

        checkService.uncheck(exercise.getExerciseId(), ANNA);
        assertEquals(0, checkService.listForUser(ANNA).size());
    }

    @Test
    void checkAndUncheck_twiceIsNoError() {
        checkService.check(exercise.getExerciseId(), ANNA);
        checkService.check(exercise.getExerciseId(), ANNA);
        assertEquals(1, checkService.listForUser(ANNA).size());

        checkService.uncheck(exercise.getExerciseId(), ANNA);
        checkService.uncheck(exercise.getExerciseId(), ANNA);
        assertEquals(0, checkService.listForUser(ANNA).size());
    }

    /** Fast clicks on "Mark as done": the same requests arrive at the same time. */
    @Test
    void parallelChecksAndUnchecks_doNotFail() throws Exception {
        UUID id = exercise.getExerciseId();
        try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
            List<Future<?>> checks = new ArrayList<>();
            for (int i = 0; i < 16; i++) checks.add(pool.submit(() -> checkService.check(id, ANNA)));
            for (Future<?> f : checks) f.get(); // throws if one request failed
            assertEquals(1, checkService.listForUser(ANNA).size());

            List<Future<?>> unchecks = new ArrayList<>();
            for (int i = 0; i < 16; i++) unchecks.add(pool.submit(() -> checkService.uncheck(id, ANNA)));
            for (Future<?> f : unchecks) f.get();
            assertEquals(0, checkService.listForUser(ANNA).size());
        }
    }

    /** A one-day period that ended {@code daysAgo} days ago, finished by the given users. */
    private void period(int daysAgo, String... finishers) {
        LocalDateTime end = LocalDateTime.now().minusDays(daysAgo);
        Period period = new Period();
        period.setExercise(exercise);
        period.setTimeRange(Range.openClosed(end.minusDays(1), end));
        Period saved = periodRepository.save(period);
        for (String username : finishers) {
            FinishedUser finishedUser = new FinishedUser();
            finishedUser.setPeriod(saved);
            finishedUser.setUsername(userRepository.findByUsername(username).orElseThrow());
            finishedUserRepository.save(finishedUser);
        }
    }
}
