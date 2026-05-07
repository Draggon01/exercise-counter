package org.exercise.counter.exercisecounter.statistic;

import io.hypersistence.utils.hibernate.type.range.Range;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibiltiy;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.statistic.StatisticController;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.MissedEntryRequestDto;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.PeriodDto;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.http.ResponseEntity;

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
    private SchedulerService schedulerService;

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

    private User testUser;
    private Exercise testExercise;

    @BeforeEach
    void setup() {
        finishedUserRepository.deleteAll();
        periodRepository.deleteAll();
        checkRepository.deleteAll();
        exerciseRepository.deleteAll();
        userRepository.deleteAll();

        // Create a test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setPassword("{bcrypt}" + "abc123");
        userRepository.save(testUser);

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
        testExercise.setVisibility(Visibiltiy.PUBLIC);
        testExercise = exerciseRepository.save(testExercise);
    }

    @Test
    void testExerciseStatisticFlowWithScheduler() {
        // 1. Simulate user checking the exercise today
        CheckId checkId = new CheckId(testExercise.getExerciseId(), testUser.getUsername());
        Check check = new Check(checkId);
        checkRepository.save(check);

        // 2. Load statistics BEFORE the scheduler runs
        StatisticDto preSchedulerStats = statisticController.loadStatistic(testExercise.getExerciseId().toString());
        Map<String, List<String>> preStatsMap = preSchedulerStats.finishedInformation();

        // Assert the user is currently checked for today
        assertTrue(preStatsMap.containsKey("current"));
        assertTrue(preStatsMap.get("current").contains(testUser.getUsername()));

        // 3. Trigger the scheduler explicitly
        schedulerService.restartSchedulerForExTest(testExercise);

        // Optional: wait a moment for the scheduled task to execute
        // (as restartSchedulerForExTest delays by 1 second in the SchedulerService)
        try {
            Thread.sleep(1500);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        // 4. Load statistics AFTER the scheduler has run
        StatisticDto postSchedulerStats = statisticController.loadStatistic(testExercise.getExerciseId().toString());
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
    void testGetUnfinishedPeriods() {
        Period period = new Period();
        period.setExercise(testExercise);
        period.setTimeRange(Range.closed(LocalDateTime.now().minusDays(1), LocalDateTime.now()));
        period = periodRepository.save(period);

        Authentication auth = buildAuth(testUser.getUsername());

        List<PeriodDto> unfinished = statisticController.getUnfinishedPeriods(
                testExercise.getExerciseId().toString(), auth);

        assertEquals(1, unfinished.size());
        assertEquals(period.getPeriodId(), unfinished.get(0).periodId());
    }

    @Test
    void testAddMissedEntry() {
        Period period = new Period();
        period.setExercise(testExercise);
        period.setTimeRange(Range.closed(LocalDateTime.now().minusDays(1), LocalDateTime.now()));
        period = periodRepository.save(period);

        Authentication auth = buildAuth(testUser.getUsername());

        MissedEntryRequestDto request = new MissedEntryRequestDto(
                testExercise.getExerciseId(), period.getPeriodId());
        ResponseEntity<Void> response = statisticController.addMissedEntry(request, auth);

        assertEquals(200, response.getStatusCode().value());
        List<PeriodDto> unfinished = statisticController.getUnfinishedPeriods(
                testExercise.getExerciseId().toString(), auth);
        assertTrue(unfinished.isEmpty(), "Period should no longer be unfinished after adding missed entry");
    }

    private Authentication buildAuth(String username) {
        UserDetails userDetails = mock(UserDetails.class);
        when(userDetails.getUsername()).thenReturn(username);
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(userDetails);
        return auth;
    }
}