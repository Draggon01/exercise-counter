package org.exercise.counter.exercisecounter.web.rest.test;

import jakarta.transaction.Transactional;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Statistic;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticId;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticJpa;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticRepository;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
public class TestController {

    private final SchedulerService schedulerService;
    private final StatisticRepository statisticRepository;
    private final ExerciseRepository exerciseRepository;

    public TestController(SchedulerService schedulerService, StatisticRepository statisticRepository, ExerciseRepository exerciseRepository) {
        this.schedulerService = schedulerService;
        this.statisticRepository = statisticRepository;
        this.exerciseRepository = exerciseRepository;
    }

    @GetMapping("/api/test3")
    @Transactional
    public String test3() {
        StatisticJpa statistic = statisticRepository.findById(UUID.fromString("b8848131-2d75-4a15-be6d-b0e002a056ce")).orElse(null);
        if(statistic != null && statistic.getStatistic() != null){
            statistic.getStatistic().upsertInformation(new StatisticId(), List.of("user1", "user2"));
            statisticRepository.save(statistic);
        }
        return "tet";
    }

    @GetMapping("/api/test2")
    public String test2() {
        StatisticJpa statisticJpa = statisticRepository.findAll().stream().findFirst().orElse(null);
        System.out.println(statisticJpa);
        if(statisticJpa != null){
            Statistic statistic = statisticJpa.getStatistic();
            statistic.upsertInformation(new StatisticId(), List.of("user1", "user2"));
            statisticRepository.save(statisticJpa);
        }
        return "tet";
    }

    @GetMapping("/api/test")
    public String test() {
        List<Exercise> all = exerciseRepository.findAll();
        for (Exercise exercise : all) {
            schedulerService.restartSchedulerForExTest(exercise);
        }
        return "Test endpoint is working!";
    }

    private Instant generateStartTime() {
        String testString = "22:05:00";
        LocalTime parse = LocalTime.parse(testString);
        LocalDate now = LocalDate.now(ZoneId.systemDefault());
        LocalDateTime targetDateTime = LocalDateTime.of(now, parse);
        if (targetDateTime.isBefore(LocalDateTime.now(ZoneId.systemDefault()))) {
            // If the time today has already passed, use tomorrow
            targetDateTime = targetDateTime.plusDays(1);
        }

        System.out.println(targetDateTime);

        return targetDateTime.atZone(ZoneId.systemDefault()).toInstant();
    }
}
