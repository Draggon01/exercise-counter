package org.exercise.counter.exercisecounter.web.rest.exercise;

import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.statistic.Statistic;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticJpa;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticRepository;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.CheckDto;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ExerciseController {

    private final ExerciseRepository exerciseRepository;
    private final CheckRepository checkRepository;
    private final StatisticRepository statisticRepository;
    private final SchedulerService schedulerService;

    public ExerciseController(ExerciseRepository exerciseRepository, CheckRepository checkRepository, StatisticRepository statisticRepository, SchedulerService schedulerService) {
        this.exerciseRepository = exerciseRepository;
        this.checkRepository = checkRepository;
        this.statisticRepository = statisticRepository;
        this.schedulerService = schedulerService;
    }

    @GetMapping("/exercises/list")
    public List<ExerciseDto> getAllExercises() {
        return exerciseRepository.findAll().stream()
                .map(exercise -> new ExerciseDto(
                        exercise.getExerciseId(),
                        exercise.getExerciseTitle(),
                        exercise.getCreator(),
                        exercise.getDaysRepeat(),
                        exercise.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                        exercise.getUtcOffset(),
                        exercise.getExerciseType(),
                        exercise.getExerciseValue(),
                        exercise.getExerciseIncrease()))
                .toList();
    }

    @PostMapping("/exercises/save")
    public ExerciseDto addExercise(@RequestBody ExerciseDto exercise, Authentication authentication) {
        checkExerciseAuthority(exercise.exerciseId(), authentication);
        Exercise save = exerciseRepository.save(
                new Exercise(
                        exercise.exerciseId(),
                        exercise.exerciseTitle(),
                        exercise.creator(),
                        exercise.daysRepeat(),
                        LocalTime.parse(exercise.startTime(),
                                DateTimeFormatter.ofPattern("HH:mm:ss")),
                        exercise.utcOffset(),
                        exercise.exerciseType(),
                        exercise.exerciseValue(),
                        exercise.exerciseIncrease()));

        //create statistic entry if not there already
        Optional<StatisticJpa> byId = statisticRepository.findById(save.getExerciseId());
        if (byId.isEmpty()) {
            statisticRepository.save(new StatisticJpa(save.getExerciseId(), new Statistic()));
        }
        schedulerService.restartSchedulerFor(save);
        return new ExerciseDto(
                save.getExerciseId(),
                save.getExerciseTitle(),
                save.getCreator(),
                save.getDaysRepeat(),
                save.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                save.getUtcOffset(),
                save.getExerciseType(),
                save.getExerciseValue(),
                save.getExerciseIncrease());
    }

    @PostMapping("/exercises/delete")
    public ExerciseDto deleteExercise(@RequestBody ExerciseDto exerciseToDelete, Authentication authentication) {
        UUID exerciseId = exerciseToDelete.exerciseId();
        checkExerciseAuthority(exerciseId, authentication);
        exerciseRepository.deleteById(exerciseId);
        return exerciseToDelete;
    }

    private void checkExerciseAuthority(UUID exerciseId, Authentication authentication) {
        if (exerciseId == null) {
            return;
        }
        exerciseRepository.findById(exerciseId)
                .ifPresent(ex -> {
                    String username = ((UserDetails) authentication.getPrincipal()).getUsername();
                    if (!username.equals(ex.getCreator())) {
                        throw new RuntimeException(username + " tried to edit/delete exercise " + ex.getExerciseId() + " which he did not create!");
                    }
                });
    }

    @GetMapping("/check/list")
    public List<CheckDto> getAllChecksForUser(Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();
        return checkRepository.findCheckByCheckIdUsername(username).stream().map(
                check -> new CheckDto(check.getCheckId().getExerciseId(), username)
        ).toList();
    }

    @GetMapping("/check/list/per/exercise")
    public Map<UUID, List<CheckDto>> getAllChecksPerExercise() {
        return exerciseRepository.findAll().stream().collect(Collectors.toMap(Exercise::getExerciseId,
                ex -> checkRepository.findCheckByCheckIdExerciseId(ex.getExerciseId())
                        .stream()
                        .map(check ->
                                new CheckDto(check.getCheckId().getExerciseId(),
                                        check.getCheckId().getUsername()))
                        .toList()
        ));
    }

    @PostMapping("/check/save")
    public CheckDto addCheckForExercise(@RequestBody CheckDto checkDto, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();
        Check check = new Check(new CheckId(checkDto.exerciseId(), username));
        checkRepository.save(check);
        return checkDto;
    }

    @PostMapping("/check/delete")
    public CheckDto removeCheckForExercise(@RequestBody CheckDto checkDto, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();
        CheckId checkId = new CheckId(checkDto.exerciseId(), username);
        checkRepository.deleteById(checkId);
        return checkDto;
    }

    @GetMapping("/exercises/exercisetype")
    public Map<String, String> getExerciseTypes() {
        return ExerciseType.getAllDescriptionsAsMap();
    }
}
