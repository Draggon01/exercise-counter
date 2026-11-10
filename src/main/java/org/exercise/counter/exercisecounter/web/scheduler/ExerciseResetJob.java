package org.exercise.counter.exercisecounter.web.scheduler;

import io.hypersistence.utils.hibernate.type.range.Range;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogRepository;
import org.exercise.counter.exercisecounter.web.data.push.PushReminderRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUser;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Closes the current period of an exercise: stores who finished it, clears checks and logs
 * and increases the exercise value for *INCREASE types.
 * <p>
 * Lives in its own bean so that {@link Transactional} is applied through the Spring proxy
 * (calling a transactional method on {@code this} from a scheduler lambda bypasses it).
 */
@Service
public class ExerciseResetJob {

    private static final Logger log = LoggerFactory.getLogger(ExerciseResetJob.class);

    private final ExerciseRepository exerciseRepository;
    private final CheckRepository checkRepository;
    private final ExerciseLogRepository exerciseLogRepository;
    private final PeriodRepository periodRepository;
    private final FinishedUserRepository finishedUserRepository;
    private final UserRepository userRepository;
    private final PushReminderRepository pushReminderRepository;
    private final Clock clock;

    @Transactional
    public void run(UUID exerciseId) {
        Exercise exercise = exerciseRepository.findById(exerciseId).orElse(null);
        if (exercise == null) {
            log.warn("Reset job fired for exercise {} which no longer exists", exerciseId);
            return;
        }
        log.info("Resetting exercise {} ({})", exercise.getExerciseId(), exercise.getExerciseType());

        LocalDateTime nowUtc = LocalDateTime.now(clock.withZone(ZoneOffset.UTC));
        LocalDateTime previousRunUtc = exercise.getLastSchedulerRun();

        if (isIncreaseType(exercise.getExerciseType())) {
            int value = Integer.parseInt(exercise.getExerciseValue());
            int increase = Integer.parseInt(exercise.getExerciseIncrease());
            exercise.setExerciseValue(String.valueOf(value + increase));
        }
        exercise.setLastSchedulerRun(nowUtc);
        exerciseRepository.save(exercise);

        List<String> finishers = collectAndClearChecks(exerciseId);
        savePeriod(exercise, previousRunUtc, nowUtc, finishers);
    }

    private static boolean isIncreaseType(ExerciseType type) {
        return type == ExerciseType.NUMBERINCREASE || type == ExerciseType.TIMEINCREASE;
    }

    private List<String> collectAndClearChecks(UUID exerciseId) {
        List<Check> checks = checkRepository.findCheckByCheckIdExerciseId(exerciseId);
        List<String> users = checks.stream().map(check -> check.getCheckId().getUsername()).toList();
        checkRepository.deleteAll(checks);
        exerciseLogRepository.deleteAll(exerciseLogRepository.findByLogIdExerciseId(exerciseId));
        pushReminderRepository.deleteByExerciseId(exerciseId); // new period: remind again
        return users;
    }

    private void savePeriod(Exercise exercise, LocalDateTime previousRunUtc, LocalDateTime nowUtc, List<String> users) {
        Period period = new Period();
        period.setExercise(exercise);
        period.setTimeRange(periodRange(exercise, previousRunUtc, nowUtc));
        Period savedPeriod = periodRepository.save(period);

        users.forEach(username -> userRepository.findByUsername(username).ifPresent(user -> {
            FinishedUser finishedUser = new FinishedUser();
            finishedUser.setPeriod(savedPeriod);
            finishedUser.setUsername(user);
            finishedUserRepository.save(finishedUser);
        }));
    }

    /**
     * Period ranges are stored in the exercise's local time (UTC + utcOffset hours), the same
     * convention the existing rows use. The range is {@code (start, end]} where start is the end
     * of the latest stored period (or the previous run / one cycle back) so that it never overlaps
     * an existing period (the table has an EXCLUDE constraint on overlapping ranges).
     */
    Range<LocalDateTime> periodRange(Exercise exercise, LocalDateTime previousRunUtc, LocalDateTime nowUtc) {
        int offset = exercise.getUtcOffset() == null ? 0 : exercise.getUtcOffset();
        LocalDateTime end = nowUtc.plusHours(offset);

        LocalDateTime start = previousRunUtc != null
                ? previousRunUtc.plusHours(offset)
                : end.minusDays(exercise.getDaysRepeat());
        LocalDateTime latestStored = periodRepository.findLatestEnd(exercise.getExerciseId());
        if (latestStored != null && latestStored.isAfter(start)) {
            start = latestStored;
        }

        if (!start.isBefore(end)) {
            // should not happen; fall back to a single point in time like the legacy rows
            return Range.closed(end, end);
        }
        return Range.openClosed(start, end);
    }

    public ExerciseResetJob(ExerciseRepository exerciseRepository,
                            CheckRepository checkRepository,
                            ExerciseLogRepository exerciseLogRepository,
                            PeriodRepository periodRepository,
                            FinishedUserRepository finishedUserRepository,
                            UserRepository userRepository,
                            PushReminderRepository pushReminderRepository,
                            Clock clock) {
        this.exerciseRepository = exerciseRepository;
        this.checkRepository = checkRepository;
        this.exerciseLogRepository = exerciseLogRepository;
        this.periodRepository = periodRepository;
        this.finishedUserRepository = finishedUserRepository;
        this.userRepository = userRepository;
        this.pushReminderRepository = pushReminderRepository;
        this.clock = clock;
    }
}
