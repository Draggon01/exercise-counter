package org.exercise.counter.exercisecounter.web.scheduler;

import io.hypersistence.utils.hibernate.type.range.Range;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLog;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.statistic.*;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.jspecify.annotations.NonNull;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.concurrent.ScheduledFuture;

@Service
@Slf4j
public class SchedulerService {
    private final ExerciseRepository exerciseRepository;
    private final CheckRepository checkRepository;
    private final ExerciseLogRepository exerciseLogRepository;
    private final PeriodRepository periodRepository;
    private final FinishedUserRepository finishedUserRepository;
    private final UserRepository userRepository;
    Map<UUID, ScheduledFuture<?>> scheduledExerciseUpdates = new HashMap<>();

    private final ThreadPoolTaskScheduler taskScheduler;

    public SchedulerService(
            ThreadPoolTaskScheduler taskScheduler,
            ExerciseRepository exerciseRepository,
            CheckRepository checkRepository,
            ExerciseLogRepository exerciseLogRepository,
            PeriodRepository periodRepository,
            FinishedUserRepository finishedUserRepository,
            UserRepository userRepository) {
        this.taskScheduler = taskScheduler;
        this.exerciseRepository = exerciseRepository;
        this.checkRepository = checkRepository;
        this.exerciseLogRepository = exerciseLogRepository;
        this.periodRepository = periodRepository;
        this.finishedUserRepository = finishedUserRepository;
        this.userRepository = userRepository;
    }

    //only use Transactional Database access inside the runnable functions
    private void addScheduledExerciseUpdate(UUID exerciseId, Runnable runnable, Instant startTime, Duration duration) {
        if (scheduledExerciseUpdates.containsKey(exerciseId)) {
            scheduledExerciseUpdates.get(exerciseId).cancel(false);
        }
        scheduledExerciseUpdates.put(exerciseId, taskScheduler.scheduleAtFixedRate(runnable, startTime, duration));
    }

    private void removeScheduledExerciseUpdate(UUID exerciseId) {
        if (scheduledExerciseUpdates.containsKey(exerciseId)) {
            scheduledExerciseUpdates.get(exerciseId).cancel(false);
        }
    }

    public long getTimeLeftSeconds(UUID exerciseId) {
        ScheduledFuture<?> future = scheduledExerciseUpdates.get(exerciseId);
        if (future == null) return 0;
        return future.getDelay(java.util.concurrent.TimeUnit.SECONDS);
    }

    @Transactional
    public void restartSchedulerFor(Exercise exercise) {
        if (this.scheduledExerciseUpdates.containsKey(exercise.getExerciseId())) {
            this.removeScheduledExerciseUpdate(exercise.getExerciseId());
        }
        Instant nextRun = calculateNextRunInstant(exercise);
        switch (exercise.getExerciseType()) {
            case ExerciseType.NUMBERREPEAT:
            case ExerciseType.TIMEREPEAT:
                this.addScheduledExerciseUpdate(
                        exercise.getExerciseId(),
                        () -> numberRepeatFunction(exercise),
                        nextRun,
                        Duration.ofDays(exercise.getDaysRepeat()));
                break;
            case ExerciseType.NUMBERINCREASE:
            case ExerciseType.TIMEINCREASE:
                this.addScheduledExerciseUpdate(
                        exercise.getExerciseId(),
                        () -> numberIncreaseFunction(exercise),
                        nextRun,
                        Duration.ofDays(exercise.getDaysRepeat()));
                break;
            default:
                break;
        }
    }

    /**
     * Calculates when the next scheduler run should start.
     * If lastSchedulerRun is known, computes the next run as lastSchedulerRun + daysRepeat days
     * (at the configured reset time). If that time is already past, schedules immediately.
     * Falls back to the default start-time calculation for new exercises with no run history.
     */
    public Instant calculateNextRunInstant(Exercise exercise) {
        LocalDateTime lastRun = exercise.getLastSchedulerRun();
        if (lastRun == null) {
            return generateStartTime(exercise.getStartTime(), exercise.getUtcOffset());
        }

        ZoneId utcZone = ZoneId.of("UTC");
        LocalTime resetTimeUtc = exercise.getStartTime().minusHours(exercise.getUtcOffset());
        LocalDateTime nextExpected = lastRun.toLocalDate()
                .plusDays(exercise.getDaysRepeat())
                .atTime(resetTimeUtc);

        ZonedDateTime nextRunZdt = ZonedDateTime.of(nextExpected, utcZone);
        ZonedDateTime now = ZonedDateTime.now(utcZone);

        if (nextRunZdt.isAfter(now)) {
            return nextRunZdt.toInstant();
        }
        // Missed the scheduled run; execute as soon as possible
        log.warn("Exercise {} missed its scheduled run (expected {}), running immediately",
                exercise.getExerciseId(), nextExpected);
        return Instant.now().plusSeconds(1);
    }

    @Transactional
    public void restartSchedulerForExTest(Exercise exercise) {
        this.addScheduledExerciseUpdate(
                exercise.getExerciseId(),
                () -> numberIncreaseFunction(exercise),
                Instant.now().plusMillis(1000),
                Duration.ofMinutes(1)
        );
    }

    /**
     * Start timers for exercises
     */
    @PostConstruct
    @Transactional
    public void startExerciseTimers() {
        log.info("Starting Schedulers for exercises");
        exerciseRepository.findAll().forEach(this::restartSchedulerFor);
    }

    private Instant generateStartTime(LocalTime localTime, Integer offsetToUtc) {
        ZoneId zoneId = ZoneId.of("UTC");
        LocalDate today = LocalDate.now(zoneId);

        ZonedDateTime targetDateTime = ZonedDateTime.of(today, localTime.minusHours(offsetToUtc), zoneId);
        ZonedDateTime now = ZonedDateTime.now(zoneId);

        if (targetDateTime.isBefore(now)) {
            targetDateTime = targetDateTime.plusDays(1);
        }
        return targetDateTime.toInstant();
    }

    @Transactional
    protected void numberRepeatFunction(Exercise exercise) {
        log.info("executed NumberRepeat function");
        exercise.setLastSchedulerRun(LocalDateTime.now(ZoneId.of("UTC")));
        exerciseRepository.save(exercise);
        List<String> users = getCheckedUsers(exercise);
        updateStatistic(exercise, users);
    }

    @Transactional
    protected void numberIncreaseFunction(Exercise exercise) {
        log.info("executed NumberIncrease function");
        exercise.setLastSchedulerRun(LocalDateTime.now(ZoneId.of("UTC")));
        int exerciseValue = Integer.parseInt(exercise.getExerciseValue());
        int exerciseIncrease = Integer.parseInt(exercise.getExerciseIncrease());
        exercise.setExerciseValue(String.valueOf(exerciseValue + exerciseIncrease));
        exerciseRepository.save(exercise);
        List<String> users = getCheckedUsers(exercise);
        updateStatistic(exercise, users);
    }

    private @NonNull List<String> getCheckedUsers(Exercise exercise) {
        UUID exerciseId = exercise.getExerciseId();
        List<Check> checkByExerciseId =
                checkRepository.findCheckByCheckIdExerciseId(exerciseId);
        List<String> users = new ArrayList<>();
        checkByExerciseId.forEach(check -> users.add(check.getCheckId().getUsername()));
        checkRepository.deleteAll(checkByExerciseId);
        List<ExerciseLog> logs = exerciseLogRepository.findByLogIdExerciseId(exerciseId);
        exerciseLogRepository.deleteAll(logs);
        return users;
    }

    private void updateStatistic(Exercise exercise, List<String> users) {
        Period period = new Period();
        period.setTimeRange(getRangeForOffset(exercise.getUtcOffset()));
        period.setExercise(exercise);
        Period savedPeriod = periodRepository.save(period);
        users.forEach(user -> {
            FinishedUser finishedUser = new FinishedUser();
            finishedUser.setPeriod(savedPeriod);
            User foundUser = userRepository.findByUsername(user).orElse(null);
            finishedUser.setUsername(foundUser);
            finishedUserRepository.save(finishedUser);
        });
    }

    private static Range<LocalDateTime> getRangeForOffset(Integer offset) {
        return Range.closed(createNowToOffset(offset), createNowToOffset(offset));
    }

    private static LocalDateTime createNowToOffset(Integer offset) {
        return LocalDateTime.now(ZoneId.systemDefault()).plusHours(offset);
    }
}
