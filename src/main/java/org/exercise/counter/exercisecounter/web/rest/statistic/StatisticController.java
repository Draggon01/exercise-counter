package org.exercise.counter.exercisecounter.web.rest.statistic;

import io.hypersistence.utils.hibernate.type.range.Range;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.*;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController()
@RequestMapping("/api")
public class StatisticController {

    private final CheckRepository checkRepository;

    private final PeriodRepository periodRepository;
    private final FinishedUserRepository finishedUserRepository;

    public StatisticController(
            CheckRepository checkRepository,
            PeriodRepository periodRepository,
            FinishedUserRepository finishedUserRepository) {
        this.checkRepository = checkRepository;
        this.periodRepository = periodRepository;
        this.finishedUserRepository = finishedUserRepository;
    }

    @GetMapping("/statistic/load")
    public StatisticDto loadStatistic(@RequestParam String exerciseId) {
        Map<String, List<String>> statistics = new HashMap<>();
        List<Period> periods = periodRepository.findByExerciseExerciseId(UUID.fromString(exerciseId));
        periods.forEach(period -> {
            List<FinishedUser> finishedUsers =
                    finishedUserRepository.findByPeriod_PeriodId(period.getPeriodId());
            List<String> list = finishedUsers.stream()
                    .map(finishedUser -> finishedUser.getUsername().getUsername()).toList();
            statistics.put(period.toKeyString(), list); //TODO make a better to Key function that also smaller periods can be shown.
        });

        Map<String, List<String>> stringListMap = generateToday(exerciseId);
        statistics.putAll(stringListMap);
        return new StatisticDto(statistics);
    }

    private Map<String, List<String>> generateToday(String exerciseId) {
        List<String> finisher = new ArrayList<>();
        checkRepository.findCheckByCheckIdExerciseId(UUID.fromString(exerciseId))
                .forEach(check -> finisher.add(check.getCheckId().getUsername()));
        return new HashMap<>() {{
            put("current", finisher);
        }};
    }
}
