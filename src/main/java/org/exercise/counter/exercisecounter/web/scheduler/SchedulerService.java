package org.exercise.counter.exercisecounter.web.scheduler;

import jakarta.annotation.PostConstruct;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Manages one scheduled reset task per exercise. The actual reset logic lives in
 * {@link ExerciseResetJob}, which runs in its own transaction.
 */
@Service
public class SchedulerService {

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);

    private final ThreadPoolTaskScheduler taskScheduler;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseResetJob exerciseResetJob;

    private final Map<UUID, ScheduledFuture<?>> scheduledExerciseUpdates = new ConcurrentHashMap<>();

    private void addScheduledExerciseUpdate(UUID exerciseId, Runnable runnable, Instant startTime, Duration duration) {
        ScheduledFuture<?> previous = scheduledExerciseUpdates.put(
                exerciseId, taskScheduler.scheduleAtFixedRate(runnable, startTime, duration));
        if (previous != null) {
            previous.cancel(false);
        }
    }

    /**
     * Stops the scheduled reset for the given exercise, e.g. when the exercise gets deleted.
     */
    public void cancelSchedulerFor(UUID exerciseId) {
        ScheduledFuture<?> future = scheduledExerciseUpdates.remove(exerciseId);
        if (future != null) {
            future.cancel(false);
        }
    }

    public boolean isScheduled(UUID exerciseId) {
        return scheduledExerciseUpdates.containsKey(exerciseId);
    }

    public long getTimeLeftSeconds(UUID exerciseId) {
        ScheduledFuture<?> future = scheduledExerciseUpdates.get(exerciseId);
        if (future == null) return 0;
        return future.getDelay(TimeUnit.SECONDS);
    }

    public void restartSchedulerFor(Exercise exercise) {
        UUID exerciseId = exercise.getExerciseId();
        cancelSchedulerFor(exerciseId);
        if (exercise.getExerciseType() == null) {
            return;
        }
        addScheduledExerciseUpdate(
                exerciseId,
                () -> runResetJob(exerciseId),
                calculateNextRunInstant(exercise),
                Duration.ofDays(exercise.getDaysRepeat()));
    }

    private void runResetJob(UUID exerciseId) {
        try {
            exerciseResetJob.run(exerciseId);
        } catch (RuntimeException e) {
            // never let an exception escape: it would silently stop all future executions
            log.error("Reset job for exercise {} failed", exerciseId, e);
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

    /**
     * Start timers for exercises
     */
    @PostConstruct
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

    public SchedulerService(ThreadPoolTaskScheduler taskScheduler, ExerciseRepository exerciseRepository, ExerciseResetJob exerciseResetJob) {
        this.taskScheduler = taskScheduler;
        this.exerciseRepository = exerciseRepository;
        this.exerciseResetJob = exerciseResetJob;
    }
}
