package org.exercise.counter.exercisecounter.web.rest.exercise;

import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.CheckDto;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.service.ExerciseService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ExerciseController {

    private final ExerciseService exerciseService;
    private final CheckRepository checkRepository;
    private final UserSelectionRepository userSelectionRepository;
    private final PeriodRepository periodRepository;
    private final FinishedUserRepository finishedUserRepository;

    public ExerciseController(ExerciseService exerciseService,
                              CheckRepository checkRepository,
                              UserSelectionRepository userSelectionRepository,
                              PeriodRepository periodRepository,
                              FinishedUserRepository finishedUserRepository) {
        this.exerciseService = exerciseService;
        this.checkRepository = checkRepository;
        this.userSelectionRepository = userSelectionRepository;
        this.periodRepository = periodRepository;
        this.finishedUserRepository = finishedUserRepository;
    }

    /** All exercises the current user may see. */
    @GetMapping("/exercises/list")
    public List<ExerciseDto> getAllExercises(@AuthenticationPrincipal UserDetails user) {
        return exerciseService.listVisible(user.getUsername());
    }

    @GetMapping("/exercises/list/selected")
    public List<ExerciseDto> getAllExercisesForUser(@AuthenticationPrincipal UserDetails user) {
        return exerciseService.listSelected(user.getUsername());
    }

    @GetMapping("/exercises/list/available")
    public List<ExerciseDto> getAllExercisesAvailableForUser(@AuthenticationPrincipal UserDetails user) {
        return exerciseService.listAvailable(user.getUsername());
    }

    @PostMapping("/exercises/save")
    public ExerciseDto addExercise(@RequestBody ExerciseDto exercise, @AuthenticationPrincipal UserDetails user) {
        return exerciseService.save(exercise, user.getUsername());
    }

    @PostMapping("/exercises/delete")
    public ExerciseDto deleteExercise(@RequestBody ExerciseDto exerciseToDelete, @AuthenticationPrincipal UserDetails user) {
        exerciseService.delete(exerciseToDelete.exerciseId(), user.getUsername());
        return exerciseToDelete;
    }

    @GetMapping("/check/list")
    public List<CheckDto> getAllChecksForUser(@AuthenticationPrincipal UserDetails user) {
        String username = user.getUsername();
        return checkRepository.findCheckByCheckIdUsername(username).stream().map(
                check -> new CheckDto(check.getCheckId().getExerciseId(), username, -1)
        ).toList();
    }

    @GetMapping("/check/list/per/exercise")
    public Map<UUID, List<CheckDto>> getAllChecksPerExercise(@AuthenticationPrincipal UserDetails user) {
        String username = user.getUsername();
        List<UUID> selectedExerciseIds = userSelectionRepository
                .findByUserSelectionId_UsernameOrderByPositionAsc(username)
                .stream()
                .map(sel -> sel.getUserSelectionId().getExerciseId())
                .toList();
        return selectedExerciseIds.stream().collect(Collectors.toMap(
                exerciseId -> exerciseId,
                exerciseId -> checkRepository.findCheckByCheckIdExerciseId(exerciseId)
                        .stream()
                        .map(check ->
                                new CheckDto(check.getCheckId().getExerciseId(),
                                        check.getCheckId().getUsername(), getStreak(check)))
                        .toList()
        ));
    }

    private Integer getStreak(Check check) {
        List<Period> periods = periodRepository.findByExerciseExerciseId(check.getCheckId().getExerciseId());
        List<Period> sortedPeriods = periods.stream()
                .sorted((p1, p2) -> p2.getTimeRange().lower().compareTo(p1.getTimeRange().lower()))
                .toList();

        int streak = 1; // 1 to add the one from checked if it is shown
        for (Period period : sortedPeriods) {
            boolean finished = finishedUserRepository.findByPeriod_PeriodId(period.getPeriodId())
                    .stream()
                    .anyMatch(fu -> fu.getUsername().getUsername().equals(check.getCheckId().getUsername()));

            if (finished) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    @PostMapping("/check/save")
    public CheckDto addCheckForExercise(@RequestBody CheckDto checkDto, @AuthenticationPrincipal UserDetails user) {
        String username = user.getUsername();
        Check check = new Check(new CheckId(checkDto.exerciseId(), username));
        checkRepository.save(check);
        return checkDto;
    }

    @PostMapping("/check/delete")
    public CheckDto removeCheckForExercise(@RequestBody CheckDto checkDto, @AuthenticationPrincipal UserDetails user) {
        String username = user.getUsername();
        CheckId checkId = new CheckId(checkDto.exerciseId(), username);
        checkRepository.deleteById(checkId);
        return checkDto;
    }

    @GetMapping("/exercises/exercisetype")
    public Map<String, String> getExerciseTypes() {
        return ExerciseType.getAllDescriptionsAsMap();
    }

    @GetMapping("/exercises/visibility")
    public List<String> getExerciseVisibilities() {
        return Arrays.stream(Visibility.values()).map(Enum::toString).toList();
    }
}
