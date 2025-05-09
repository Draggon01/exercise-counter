package org.exercise.counter.exercisecounter.web.rest.statistic;

import org.exercise.counter.exercisecounter.web.data.statistic.Statistic;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticJpa;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticRepository;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController()
@RequestMapping("/api")
public class StatisticController {

    private final StatisticRepository statisticRepository;

    public StatisticController(StatisticRepository statisticRepository) {
        this.statisticRepository = statisticRepository;
    }

    @GetMapping("/statistic/load")
    public StatisticDto loadStatistic(@RequestParam String exerciseId) {
        StatisticJpa statisticJpa = statisticRepository.findById(UUID.fromString(exerciseId)).orElseThrow();
        return this.map(statisticJpa.getStatistic());
    }

    private StatisticDto map(Statistic statistic) {
        Map<String, List<String>> toDto = new HashMap<>();
        statistic.getFinishedInformation().forEach((key, value) -> toDto.put(key.toKeyString(), value));
        return new StatisticDto(toDto);
    }


}
