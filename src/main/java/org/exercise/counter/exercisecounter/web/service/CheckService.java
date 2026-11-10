package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.check.dto.CheckDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
        Map<UUID, List<CheckDto>> result = new LinkedHashMap<>();
        userSelectionRepository.findByUserSelectionId_UsernameOrderByPositionAsc(username)
                .forEach(selection -> {
                    UUID exerciseId = selection.getUserSelectionId().getExerciseId();
                    result.put(exerciseId, checkRepository.findCheckByCheckIdExerciseId(exerciseId).stream()
                            .map(check -> new CheckDto(exerciseId, check.getCheckId().getUsername(),
                                    streak(exerciseId, check.getCheckId().getUsername())))
                            .toList());
                });
        return result;
    }

    @Transactional
    public void check(UUID exerciseId, String username) {
        checkRepository.save(new Check(new CheckId(exerciseId, username)));
    }

    @Transactional
    public void uncheck(UUID exerciseId, String username) {
        checkRepository.deleteById(new CheckId(exerciseId, username));
    }

    /**
     * Streak of a user who checked the exercise in the current period: 1 for the current period
     * plus the number of directly preceding periods the user finished.
     */
    @Transactional(readOnly = true)
    public int streak(UUID exerciseId, String username) {
        List<Period> newestFirst = periodRepository.findByExerciseExerciseId(exerciseId).stream()
                .sorted(Comparator.comparing((Period p) -> p.getTimeRange().lower()).reversed())
                .toList();

        int streak = 1;
        for (Period period : newestFirst) {
            boolean finished = finishedUserRepository.findByPeriod_PeriodId(period.getPeriodId()).stream()
                    .anyMatch(fu -> fu.getUsername().getUsername().equals(username));
            if (!finished) {
                break;
            }
            streak++;
        }
        return streak;
    }
}
