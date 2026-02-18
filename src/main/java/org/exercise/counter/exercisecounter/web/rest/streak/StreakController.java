package org.exercise.counter.exercisecounter.web.rest.streak;

import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticId;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticJpa;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticRepository;
import org.exercise.counter.exercisecounter.web.data.streak.CompleteStreak;
import org.exercise.counter.exercisecounter.web.data.streak.CompleteStreakRepository;
import org.exercise.counter.exercisecounter.web.data.streak.ExerciseStreak;
import org.exercise.counter.exercisecounter.web.data.streak.ExerciseStreakRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.statistic.StatisticController;
import org.hibernate.annotations.Parameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/streak")
public class StreakController {
    private final CompleteStreakRepository completeStreakRepository;
    private final ExerciseStreakRepository exerciseStreakRepository;
    private final CheckRepository checkRepository;

    public StreakController(CompleteStreakRepository completeStreakRepository,
                            ExerciseStreakRepository exerciseStreakRepository, CheckRepository checkRepository) {
        this.completeStreakRepository = completeStreakRepository;
        this.exerciseStreakRepository = exerciseStreakRepository;
        this.checkRepository = checkRepository;
    }


    @GetMapping("/complete")
    public Integer getCompleteStreak(Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();
        Optional<CompleteStreak> byId = completeStreakRepository.findById(username);
        return byId.map(CompleteStreak::getStreak).orElse(0);
    }


    @PostMapping("/exercise")
    public Map<String, Integer> getStreaksForUsersOfExercise(@RequestParam String exerciseId){
        List<ExerciseStreak> exerciseStreaks = exerciseStreakRepository.findAllByExerciseStreakIdExerciseId(UUID.fromString(exerciseId));
        Map<String, Integer> mapped = new HashMap<>();

        for (ExerciseStreak exerciseStreak : exerciseStreaks) {
            List<Check> checkByCheckIdExerciseId =
                    checkRepository.findCheckByCheckIdExerciseId(UUID.fromString(exerciseId));
            Check check1 =
                    checkByCheckIdExerciseId.stream()
                            .filter(check -> check.getCheckId().getUsername().equals(exerciseStreak.getUsername()))
                            .findFirst()
                            .orElse(null);
            mapped.put(exerciseStreak.getUsername(), exerciseStreak.getStreak() + (check1 == null ? 0 : 1));
        }
        return mapped;
    }

}
