package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUser;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodFinisher;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.rest.error.ForbiddenException;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
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

    /** How many of the newest periods can be marked as finished afterwards. */
    public static final int MISSED_ENTRY_PERIODS = 7;

    private final CheckRepository checkRepository;
    private final PeriodRepository periodRepository;
    private final FinishedUserRepository finishedUserRepository;
    private final UserRepository userRepository;
    private final UserSelectionRepository userSelectionRepository;

    public StatisticService(CheckRepository checkRepository,
                            PeriodRepository periodRepository,
                            FinishedUserRepository finishedUserRepository,
                            UserRepository userRepository,
                            UserSelectionRepository userSelectionRepository) {
        this.checkRepository = checkRepository;
        this.periodRepository = periodRepository;
        this.finishedUserRepository = finishedUserRepository;
        this.userRepository = userRepository;
        this.userSelectionRepository = userSelectionRepository;
    }

    /**
     * Finishers per closed period (keyed by reset day) plus {@value #CURRENT_PERIOD_KEY} for the running one.
     * Periods closed on the same day are merged. Also lists who currently has the exercise on their home page.
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
        return new StatisticDto(statistics, userSelectionRepository.findUsernamesByExerciseId(exerciseId));
    }

    /** period id → usernames that finished it, loaded in one query. */
    private Map<UUID, List<String>> finishersByPeriod(UUID exerciseId) {
        return finishedUserRepository.findFinishersByExerciseIds(List.of(exerciseId)).stream()
                .collect(Collectors.groupingBy(PeriodFinisher::periodId,
                        Collectors.mapping(PeriodFinisher::username, Collectors.toList())));
    }

    /**
     * Marks a past period as finished by the user ("forgot to tap Done"). Only the last
     * {@link #MISSED_ENTRY_PERIODS} periods can be added afterwards, only for exercises on the user's home list.
     *
     * @param date the day the period closed (YYYY-MM-DD) – periods closed on the same day count as one
     */
    @Transactional
    public void addMissedEntry(UUID exerciseId, String date, String username) {
        User user = findUser(username);
        LocalDate day = parseDay(date);
        List<Period> newestFirst = periodRepository.findByExerciseExerciseId(exerciseId).stream()
                .sorted(Comparator.comparing((Period p) -> p.getTimeRange().upper()).reversed())
                .toList();
        Period period = newestFirst.stream()
                .filter(p -> p.getTimeRange().upper().toLocalDate().equals(day))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Period not found"));
        if (!userSelectionRepository.existsById(new UserSelectionId(username, exerciseId))) {
            throw new ForbiddenException("Only for exercises on your home page");
        }
        List<LocalDate> recentDays = newestFirst.stream()
                .map(p -> p.getTimeRange().upper().toLocalDate())
                .distinct()
                .limit(MISSED_ENTRY_PERIODS)
                .toList();
        if (!recentDays.contains(day)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only the last " + MISSED_ENTRY_PERIODS + " periods can be added afterwards");
        }
        if (finishedUserRepository.existsByPeriod_PeriodIdAndUsername(period.getPeriodId(), user)) {
            return;
        }
        FinishedUser finishedUser = new FinishedUser();
        finishedUser.setPeriod(period);
        finishedUser.setUsername(user);
        finishedUserRepository.save(finishedUser);
    }

    private static LocalDate parseDay(String date) {
        try {
            return LocalDate.parse(date == null ? "" : date.trim());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date, expected YYYY-MM-DD");
        }
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
