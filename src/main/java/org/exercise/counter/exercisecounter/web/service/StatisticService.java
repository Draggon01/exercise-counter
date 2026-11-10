package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUser;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodFinisher;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.PeriodDto;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Who finished which period of an exercise, and back-filling missed entries.
 */
@Service
public class StatisticService {

    /** Key of the still-running period in {@link StatisticDto}. */
    public static final String CURRENT_PERIOD_KEY = "current";

    private final CheckRepository checkRepository;
    private final PeriodRepository periodRepository;
    private final FinishedUserRepository finishedUserRepository;
    private final UserRepository userRepository;

    public StatisticService(CheckRepository checkRepository,
                            PeriodRepository periodRepository,
                            FinishedUserRepository finishedUserRepository,
                            UserRepository userRepository) {
        this.checkRepository = checkRepository;
        this.periodRepository = periodRepository;
        this.finishedUserRepository = finishedUserRepository;
        this.userRepository = userRepository;
    }

    /**
     * Finishers per closed period (keyed by reset day) plus {@value #CURRENT_PERIOD_KEY} for the running one.
     * Periods closed on the same day are merged.
     */
    @Transactional(readOnly = true)
    public StatisticDto load(UUID exerciseId) {
        Map<UUID, List<String>> finishers = finishersByPeriod(exerciseId);
        Map<String, List<String>> statistics = new HashMap<>();
        for (Period period : periodRepository.findByExerciseExerciseId(exerciseId)) {
            statistics.merge(period.toKeyString(), finishers.getOrDefault(period.getPeriodId(), List.of()),
                    StatisticService::union);
        }
        statistics.put(CURRENT_PERIOD_KEY, checkRepository.findCheckByCheckIdExerciseId(exerciseId).stream()
                .map(check -> check.getCheckId().getUsername())
                .toList());
        return new StatisticDto(statistics);
    }

    /** Closed periods of the exercise the user did not finish. */
    @Transactional(readOnly = true)
    public List<PeriodDto> unfinishedPeriods(UUID exerciseId, String username) {
        Map<UUID, List<String>> finishers = finishersByPeriod(exerciseId);
        return periodRepository.findByExerciseExerciseId(exerciseId).stream()
                .filter(period -> !finishers.getOrDefault(period.getPeriodId(), List.of()).contains(username))
                .map(period -> new PeriodDto(period.getPeriodId(), period.toKeyString()))
                .toList();
    }

    /** period id → usernames that finished it, loaded in one query. */
    private Map<UUID, List<String>> finishersByPeriod(UUID exerciseId) {
        return finishedUserRepository.findFinishersByExerciseIds(List.of(exerciseId)).stream()
                .collect(Collectors.groupingBy(PeriodFinisher::periodId,
                        Collectors.mapping(PeriodFinisher::username, Collectors.toList())));
    }

    /** Marks a past period of the exercise as finished by the user (idempotent). */
    @Transactional
    public void addMissedEntry(UUID exerciseId, UUID periodId, String username) {
        User user = findUser(username);
        Period period = periodRepository.findById(periodId)
                .filter(p -> p.getExercise().getExerciseId().equals(exerciseId))
                .orElseThrow(() -> new NotFoundException("Period not found"));
        if (finishedUserRepository.existsByPeriod_PeriodIdAndUsername(period.getPeriodId(), user)) {
            return;
        }
        FinishedUser finishedUser = new FinishedUser();
        finishedUser.setPeriod(period);
        finishedUser.setUsername(user);
        finishedUserRepository.save(finishedUser);
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username).orElseThrow(() -> new NotFoundException("User not found"));
    }

    private static List<String> union(List<String> a, List<String> b) {
        LinkedHashSet<String> all = new LinkedHashSet<>(a);
        all.addAll(b);
        return new ArrayList<>(all);
    }
}
