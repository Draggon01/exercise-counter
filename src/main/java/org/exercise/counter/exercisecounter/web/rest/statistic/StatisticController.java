package org.exercise.counter.exercisecounter.web.rest.statistic;

import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Statistic;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticId;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticJpa;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticRepository;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController()
@RequestMapping("/api")
public class StatisticController {

    private final StatisticRepository statisticRepository;
    private final CheckRepository checkRepository;

    public StatisticController(StatisticRepository statisticRepository, CheckRepository checkRepository) {
        this.statisticRepository = statisticRepository;
        this.checkRepository = checkRepository;
    }

    @GetMapping("/statistic/load")
    public StatisticDto loadStatistic(@RequestParam String exerciseId) {
        StatisticJpa statisticJpa = statisticRepository.findById(UUID.fromString(exerciseId)).orElse(null);
        if(statisticJpa == null){
            statisticJpa = statisticRepository.save(new StatisticJpa(UUID.fromString(exerciseId), new Statistic()));
        }
        return this.map(statisticJpa.getStatistic(), this.generateToday(exerciseId));
    }

    private Map<String, List<String>> generateToday(String exerciseId) {
        List<String> finisher = new ArrayList<>();
        checkRepository.findCheckByCheckIdExerciseId(UUID.fromString(exerciseId))
                .forEach(check -> finisher.add(check.getCheckId().getUsername()));
        StatisticId statisticId = new StatisticId(); //TODO use correct statisticId
        return new HashMap<>() {{
            put("current", finisher);
        }};
    }

    private StatisticDto map(Statistic statistic, Map<String, List<String>> currentEntry) {
        Map<String, List<String>> toDto = new HashMap<>();
        statistic.getFinishedInformation().forEach((key, value) -> toDto.put(key.toKeyString(), value));
        toDto.putAll(currentEntry);
        return new StatisticDto(toDto);
    }


}
