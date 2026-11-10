package org.exercise.counter.exercisecounter.statistic;

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
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.service.StatisticService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class StatisticServiceTest {

    private static final String A = "stat-a";
    private static final String B = "stat-b";

    @Autowired private StatisticService statisticService;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private PeriodRepository periodRepository;
    @Autowired private FinishedUserRepository finishedUserRepository;
    @Autowired private UserRepository userRepository;

    private Exercise first;
    private Exercise second;

    @BeforeEach
    void setup() {
        for (String name : List.of(A, B)) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}x"));
            }
        }
        first = exercise("first");
        second = exercise("second");
    }

    @AfterEach
    void cleanup() {
        exerciseRepository.deleteAll(List.of(first, second));
    }

    @Test
    void periodsClosedOnTheSameDay_areMerged() {
        LocalDateTime day = LocalDate.now().minusDays(1).atTime(10, 0);
        period(first, Range.openClosed(day.minusDays(1), day), A);
        period(first, Range.openClosed(day, day.plusHours(2)), B); // catch-up run later that day

        Map<String, List<String>> stats = statisticService.load(first.getExerciseId()).finishedInformation();

        String key = day.toLocalDate() + ":" + day.toLocalDate();
        assertEquals(Set.of(A, B), Set.copyOf(stats.get(key)));
        assertEquals(List.of(), stats.get(StatisticService.CURRENT_PERIOD_KEY));
    }

    @Test
    void addMissedEntry_rejectsPeriodOfAnotherExercise() {
        LocalDateTime end = LocalDateTime.now().minusDays(1);
        Period foreign = period(second, Range.openClosed(end.minusDays(1), end));

        assertThrows(NotFoundException.class,
                () -> statisticService.addMissedEntry(first.getExerciseId(), foreign.getPeriodId(), A));
        assertTrue(finishedUserRepository.findByPeriod_PeriodId(foreign.getPeriodId()).isEmpty());
    }

    @Test
    void addMissedEntry_marksPeriodFinished_once() {
        LocalDateTime end = LocalDateTime.now().minusDays(1);
        Period period = period(first, Range.openClosed(end.minusDays(1), end));

        statisticService.addMissedEntry(first.getExerciseId(), period.getPeriodId(), A);
        statisticService.addMissedEntry(first.getExerciseId(), period.getPeriodId(), A);

        assertEquals(1, finishedUserRepository.findByPeriod_PeriodId(period.getPeriodId()).size());
        assertTrue(statisticService.unfinishedPeriods(first.getExerciseId(), A).isEmpty());
    }

    private Exercise exercise(String title) {
        Exercise e = new Exercise();
        e.setExerciseTitle(title);
        e.setCreator(A);
        e.setDaysRepeat(1);
        e.setStartTime(LocalTime.NOON);
        e.setUtcOffset(0);
        e.setExerciseType(ExerciseType.NUMBERREPEAT);
        e.setExerciseValue("1");
        e.setVisibility(Visibility.PUBLIC);
        return exerciseRepository.save(e);
    }

    private Period period(Exercise exercise, Range<LocalDateTime> range, String... finishers) {
        Period period = new Period();
        period.setExercise(exercise);
        period.setTimeRange(range);
        Period saved = periodRepository.save(period);
        for (String username : finishers) {
            FinishedUser fu = new FinishedUser();
            fu.setPeriod(saved);
            fu.setUsername(userRepository.findByUsername(username).orElseThrow());
            finishedUserRepository.save(fu);
        }
        return saved;
    }
}
