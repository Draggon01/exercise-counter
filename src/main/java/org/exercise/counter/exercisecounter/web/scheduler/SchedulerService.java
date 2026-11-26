package org.exercise.counter.exercisecounter.web.scheduler;

import jakarta.annotation.PostConstruct;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Manages the next reset of every exercise. The actual reset logic lives in {@link ExerciseResetJob},
 * which runs in its own transaction; afterwards the following reset is planned.
 */
@Service
public class SchedulerService {

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);

    private final ThreadPoolTaskScheduler taskScheduler;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseResetJob exerciseResetJob;
    private final Clock clock;

    /** The next reset of each exercise (one-shot – after it ran, the following one is planned). */
    private final Map<UUID, ScheduledFuture<?>> scheduledExerciseUpdates = new ConcurrentHashMap<>();

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
        return Math.max(0, future.getDelay(TimeUnit.SECONDS));
    }

    /** Plans the next reset of the exercise (replacing a planned one). */
    public void restartSchedulerFor(Exercise exercise) {
        UUID exerciseId = exercise.getExerciseId();
        if (exercise.getExerciseType() == null) {
            cancelSchedulerFor(exerciseId);
            return;
        }
        ScheduledFuture<?> previous = scheduledExerciseUpdates.put(exerciseId,
                taskScheduler.schedule(() -> runResetJob(exerciseId), calculateNextRunInstant(exercise)));
        if (previous != null) {
            previous.cancel(false);
        }
    }

    private void runResetJob(UUID exerciseId) {
        try {
            exerciseResetJob.run(exerciseId);
        } catch (RuntimeException e) {
            // never let an exception escape – the next reset is planned anyway
            log.error("Reset job for exercise {} failed", exerciseId, e);
        }
        // plan the following reset from the calendar (keeps the clock time across daylight saving time)
        exerciseRepository.findById(exerciseId).ifPresentOrElse(this::restartSchedulerFor,
                () -> scheduledExerciseUpdates.remove(exerciseId));
    }

    /**
     * An edit keeps the running period: the next reset is counted from the last one with the new
     * settings (a weekly exercise edited on day 2 still resets on day 7, not tomorrow). If the new
     * settings say the period is already over (fewer days, earlier time), it ends at the next reset
     * time from now instead of right away – remembered in {@code resetNotBefore}, so a restart keeps it.
     *
     * @param edited   the exercise as it will be saved
     * @param lastRun  last reset of the exercise before the edit (null: it never reset)
     */
    public void keepCurrentPeriod(Exercise edited, LocalDateTime lastRun) {
        edited.setLastSchedulerRun(lastRun);
        edited.setResetNotBefore(null);
        if (lastRun == null) {
            return;
        }
        Instant now = clock.instant();
        Instant next = ResetSchedule.nextRun(edited.getStartTime(), edited.zone(), edited.getDaysRepeat(), lastRun, now);
        if (!next.isAfter(now.plusSeconds(1))) {
            edited.setResetNotBefore(ResetSchedule.nextRun(edited.getStartTime(), edited.zone(),
                    edited.getDaysRepeat(), null, now));
        }
    }

    /**
     * When the next reset is due: {@code lastSchedulerRun + daysRepeat} days at the reset time in the
     * exercise's time zone, or the next occurrence of the reset time for new exercises, but not before
     * {@code resetNotBefore} (see {@link #keepCurrentPeriod}). Overdue (the server was down): right away.
     * See {@link ResetSchedule}.
     */
    public Instant calculateNextRunInstant(Exercise exercise) {
        Instant now = clock.instant();
        Instant next = ResetSchedule.nextRun(exercise.getStartTime(), exercise.zone(), exercise.getDaysRepeat(),
                exercise.getLastSchedulerRun(), now);
        Instant notBefore = exercise.getResetNotBefore();
        if (notBefore != null && notBefore.isAfter(next)) {
            return notBefore;
        }
        if (exercise.getLastSchedulerRun() != null && !next.isAfter(now.plusSeconds(1))) {
            log.warn("Exercise {} missed its scheduled reset, running it now", exercise.getExerciseId());
        }
        return next;
    }

    /**
     * Start timers for exercises
     */
    @PostConstruct
    public void startExerciseTimers() {
        log.info("Starting Schedulers for exercises");
        exerciseRepository.findAll().forEach(this::restartSchedulerFor);
    }

    public SchedulerService(ThreadPoolTaskScheduler taskScheduler, ExerciseRepository exerciseRepository,
                            ExerciseResetJob exerciseResetJob, Clock clock) {
        this.taskScheduler = taskScheduler;
        this.exerciseRepository = exerciseRepository;
        this.exerciseResetJob = exerciseResetJob;
        this.clock = clock;
    }
}
