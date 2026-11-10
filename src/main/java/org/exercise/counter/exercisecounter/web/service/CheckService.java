package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodFinisher;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.check.dto.CheckDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * "Finished" checks for the current period and the streaks derived from past periods.
 */
@Service
public class CheckService {

    /** Streak value sent when it was not calculated. */
    public static final int STREAK_NOT_CALCULATED = -1;

    private final CheckRepository checkRepository;
    private final UserSelectionRepository userSelectionRepository;
    private final PeriodRepository periodRepository;
    private final FinishedUserRepository finishedUserRepository;

    public CheckService(CheckRepository checkRepository,
                        UserSelectionRepository userSelectionRepository,
                        PeriodRepository periodRepository,
                        FinishedUserRepository finishedUserRepository) {
        this.checkRepository = checkRepository;
        this.userSelectionRepository = userSelectionRepository;
        this.periodRepository = periodRepository;
        this.finishedUserRepository = finishedUserRepository;
    }

    /** The exercises the user has checked in the current period (without streaks). */
    @Transactional(readOnly = true)
    public List<CheckDto> listForUser(String username) {
        return checkRepository.findCheckByCheckIdUsername(username).stream()
                .map(check -> new CheckDto(check.getCheckId().getExerciseId(), username, STREAK_NOT_CALCULATED))
                .toList();
    }

    /** For every exercise on the user's home page: who has checked it, with their streak. */
    @Transactional(readOnly = true)
    public Map<UUID, List<CheckDto>> listPerSelectedExercise(String username) {
        List<UUID> exerciseIds = userSelectionRepository.findWithExerciseByUsername(username).stream()
                .map(selection -> selection.getUserSelectionId().getExerciseId())
                .toList();
        Map<UUID, List<CheckDto>> result = new LinkedHashMap<>();
        exerciseIds.forEach(id -> result.put(id, new ArrayList<>()));
        if (exerciseIds.isEmpty()) {
            return result;
        }

        StreakCalculator streaks = new StreakCalculator(exerciseIds);
        for (Check check : checkRepository.findByCheckIdExerciseIdIn(exerciseIds)) {
            UUID exerciseId = check.getCheckId().getExerciseId();
            String checker = check.getCheckId().getUsername();
            result.get(exerciseId).add(new CheckDto(exerciseId, checker, streaks.streak(exerciseId, checker)));
        }
        return result;
    }

    @Transactional
    public void check(UUID exerciseId, String username) {
        checkRepository.insertIfAbsent(exerciseId, username);
    }

    @Transactional
    public void uncheck(UUID exerciseId, String username) {
        checkRepository.deleteIfPresent(exerciseId, username);
    }

    /**
     * Streak of a user who checked the exercise in the current period: 1 for the current period
     * plus the number of directly preceding periods the user finished.
     */
    @Transactional(readOnly = true)
    public int streak(UUID exerciseId, String username) {
        return new StreakCalculator(List.of(exerciseId)).streak(exerciseId, username);
    }

    /**
     * Loads periods and finishers of several exercises with two queries and computes streaks in memory.
     */
    private final class StreakCalculator {

        private final Map<UUID, List<UUID>> periodIdsNewestFirst;
        private final Map<UUID, Set<String>> finishersByPeriod;

        StreakCalculator(Collection<UUID> exerciseIds) {
            periodIdsNewestFirst = periodRepository.findByExerciseExerciseIdIn(exerciseIds).stream()
                    .sorted(Comparator.comparing((Period p) -> p.getTimeRange().lower()).reversed())
                    .collect(Collectors.groupingBy(p -> p.getExercise().getExerciseId(),
                            Collectors.mapping(Period::getPeriodId, Collectors.toList())));
            finishersByPeriod = finishedUserRepository.findFinishersByExerciseIds(exerciseIds).stream()
                    .collect(Collectors.groupingBy(PeriodFinisher::periodId,
                            Collectors.mapping(PeriodFinisher::username, Collectors.toSet())));
        }

        int streak(UUID exerciseId, String username) {
            int streak = 1;
            for (UUID periodId : periodIdsNewestFirst.getOrDefault(exerciseId, List.of())) {
                if (!finishersByPeriod.getOrDefault(periodId, Set.of()).contains(username)) {
                    break;
                }
                streak++;
            }
            return streak;
        }
    }
}
