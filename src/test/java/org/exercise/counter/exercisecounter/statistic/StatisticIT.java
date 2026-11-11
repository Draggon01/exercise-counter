package org.exercise.counter.exercisecounter.statistic;

import io.hypersistence.utils.hibernate.type.range.Range;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.statistic.StatisticController;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.MissedEntryRequest;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.exercise.counter.exercisecounter.web.scheduler.ExerciseResetJob;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;


import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
public class StatisticIT {

    @Autowired
    private StatisticController statisticController;

    @Autowired
    private ExerciseResetJob exerciseResetJob;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private CheckRepository checkRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PeriodRepository periodRepository;

    @Autowired
    private FinishedUserRepository finishedUserRepository;

    @Autowired
    private UserSelectionRepository userSelectionRepository;

    private User testUser;
    private Exercise testExercise;

    @BeforeEach
    void setup() {
        finishedUserRepository.deleteAll();
        periodRepository.deleteAll();
        checkRepository.deleteAll();
        exerciseRepository.deleteAll();

        // Create a test user (only touch our own user: other test classes share this database)
        testUser = userRepository.findByUsername("statisticuser").orElseGet(() -> {
            User user = new User();
            user.setUsername("statisticuser");
            user.setPassword("{bcrypt}" + "abc123");
            return userRepository.save(user);
        });

        // Create a test exercise
        testExercise = new Exercise();
        testExercise.setExerciseTitle("Pushups");
        testExercise.setCreator(testUser.getUsername());
        testExercise.setDaysRepeat(1);
        testExercise.setStartTime(LocalTime.of(12, 0));
        testExercise.setUtcOffset(0);
        testExercise.setExerciseType(ExerciseType.NUMBERINCREASE);
        testExercise.setExerciseValue("10");
        testExercise.setExerciseIncrease("2");
        testExercise.setVisibility(Visibility.PUBLIC);
        testExercise = exerciseRepository.save(testExercise);
    }

    @Test
    void testExerciseStatisticFlowWithScheduler() {
        // 1. Simulate user checking the exercise today
        CheckId checkId = new CheckId(testExercise.getExerciseId(), testUser.getUsername());
        Check check = new Check(checkId);
        checkRepository.save(check);

        // 2. Load statistics BEFORE the scheduler runs
        StatisticDto preSchedulerStats = statisticController.load(testExercise.getExerciseId());
        Map<String, List<String>> preStatsMap = preSchedulerStats.finishedInformation();

        // Assert the user is currently checked for today
        assertTrue(preStatsMap.containsKey("current"));
        assertTrue(preStatsMap.get("current").contains(testUser.getUsername()));

        // 3. Run the reset job (what the scheduler executes)
        exerciseResetJob.run(testExercise.getExerciseId());

        // 4. Load statistics AFTER the scheduler has run
        StatisticDto postSchedulerStats = statisticController.load(testExercise.getExerciseId());
        Map<String, List<String>> postStatsMap = postSchedulerStats.finishedInformation();

        // After the scheduler runs:
        // - the 'current' checks should be cleared out
        // - a new period should be created in the statistics containing the finished user
        assertTrue(postStatsMap.containsKey("current"));
        assertTrue(postStatsMap.get("current").isEmpty());

        // Verify that a period key exists and contains our user
        long periodCount = postStatsMap.keySet().stream()
                .filter(key -> !key.equals("current"))
                .count();
        assertEquals(1, periodCount, "There should be exactly one period generated by the scheduler");

        String periodKey = postStatsMap.keySet().stream()
                .filter(key -> !key.equals("current"))
                .findFirst().orElseThrow();

        assertTrue(postStatsMap.get(periodKey).contains(testUser.getUsername()));

        // 5. Verify the exercise value was increased by the scheduler
        Exercise updatedExercise = exerciseRepository.findById(testExercise.getExerciseId()).orElseThrow();
        assertEquals("12", updatedExercise.getExerciseValue(), "Exercise value should have been increased by 2");
    }

    @Test
    void testAddMissedEntry() {
        Period period = new Period();
        period.setExercise(testExercise);
        period.setTimeRange(Range.closed(LocalDateTime.now().minusDays(1), LocalDateTime.now()));
        period = periodRepository.save(period);
        userSelectionRepository.save(new UserSelection(new UserSelectionId(testUser.getUsername(), testExercise.getExerciseId()), 0));
        String day = period.getTimeRange().upper().toLocalDate().toString();

        statisticController.addMissedEntry(testExercise.getExerciseId(), new MissedEntryRequest(day), buildAuth(testUser.getUsername()));

        assertTrue(statisticController.load(testExercise.getExerciseId()).finishedInformation().get(day + ":" + day)
                .contains(testUser.getUsername()), "the period counts as finished after adding the missed entry");
    }

    private UserDetails buildAuth(String username) {
        UserDetails userDetails = mock(UserDetails.class);
        when(userDetails.getUsername()).thenReturn(username);
        return userDetails;
    }
}