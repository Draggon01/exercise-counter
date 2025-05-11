package org.exercise.counter.exercisecounter.web.scheduler;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.statistic.Statistic;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticId;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticJpa;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticRepository;
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
    private final StatisticRepository statisticRepository;
    Map<UUID, ScheduledFuture<?>> scheduledExerciseUpdates = new HashMap<>();

    private final ThreadPoolTaskScheduler taskScheduler;

    public SchedulerService(ThreadPoolTaskScheduler taskScheduler, ExerciseRepository exerciseRepository, CheckRepository checkRepository, StatisticRepository statisticRepository) {
        this.taskScheduler = taskScheduler;
        this.exerciseRepository = exerciseRepository;
        this.checkRepository = checkRepository;
        this.statisticRepository = statisticRepository;
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

    public void restartSchedulerFor(Exercise exercise) {
        if (this.scheduledExerciseUpdates.containsKey(exercise.getExerciseId())) {
            this.removeScheduledExerciseUpdate(exercise.getExerciseId());
        }
        switch (exercise.getExerciseType()) {
            case ExerciseType.NUMBERREPEAT:
            case ExerciseType.TIMEREPEAT:
                this.addScheduledExerciseUpdate(
                        exercise.getExerciseId(),
                        () -> numberRepeatFunction(exercise),
                        this.generateStartTime(exercise.getStartTime(), exercise.getUtcOffset()),
                        Duration.ofDays(exercise.getDaysRepeat()));
                break;
            case ExerciseType.NUMBERINCREASE:
            case ExerciseType.TIMEINCREASE:
                this.addScheduledExerciseUpdate(
                        exercise.getExerciseId(),
                        () -> numberIncreaseFunction(exercise),
                        this.generateStartTime(exercise.getStartTime(), exercise.getUtcOffset()),
                        Duration.ofDays(exercise.getDaysRepeat()));
                break;
            default:
                break;
        }
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

    private void numberRepeatFunction(Exercise exercise) {
        log.info("executed NumberRepeat function");
        UUID exerciseId = exercise.getExerciseId();
        List<Check> checkByExerciseId =
                checkRepository.findCheckByCheckIdExerciseId(exerciseId);
        List<String> users = new ArrayList<>();
        checkByExerciseId.forEach(check -> users.add(check.getCheckId().getUsername()));
        checkRepository.deleteAll(checkByExerciseId);
        StatisticJpa statisticJpa = statisticRepository.findById(exerciseId).orElse(new StatisticJpa(exerciseId, new Statistic()));
        statisticJpa.getStatistic().upsertInformation(new StatisticId(exercise.getUtcOffset()), users);
        statisticRepository.save(statisticJpa);
    }

    private void numberIncreaseFunction(Exercise exercise) {
        log.info("executed NumberRepeat function");
        UUID exerciseId = exercise.getExerciseId();
        List<Check> checkByExerciseId =
                checkRepository.findCheckByCheckIdExerciseId(exerciseId);
        List<String> users = new ArrayList<>();
        checkByExerciseId.forEach(check -> users.add(check.getCheckId().getUsername()));
        checkRepository.deleteAll(checkByExerciseId);
        StatisticJpa statisticJpa = statisticRepository.findById(exerciseId).orElse(new StatisticJpa(exerciseId, new Statistic()));
        statisticJpa.getStatistic().upsertInformation(new StatisticId(exercise.getUtcOffset()), users);
        statisticRepository.save(statisticJpa);
        int exerciseValue = Integer.parseInt(exercise.getExerciseValue());
        int exerciseIncrease = Integer.parseInt(exercise.getExerciseIncrease());
        exercise.setExerciseValue(String.valueOf(exerciseValue + exerciseIncrease));
        exerciseRepository.save(exercise);
    }

}
