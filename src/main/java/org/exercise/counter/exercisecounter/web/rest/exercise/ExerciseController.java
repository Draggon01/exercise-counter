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
import java.util.Optional;
import java.util.UUID;

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
                        ExerciseType.NUMBERREPEAT))
                .toList();
    }

    @PostMapping("/exercises/save")
    public ExerciseDto addExercise(@RequestBody ExerciseDto exercise) {
        Exercise save = exerciseRepository.save(
                new Exercise(
                        exercise.exerciseId(),
                        exercise.exerciseTitle(),
                        exercise.creator(),
                        exercise.daysRepeat(),
                        LocalTime.parse(exercise.startTime(),
                                DateTimeFormatter.ofPattern("HH:mm:ss")),
                        exercise.utcOffset(),
                        ExerciseType.NUMBERREPEAT));

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
                ExerciseType.NUMBERREPEAT);
    }

    @PostMapping("/exercises/delete")
    public ExerciseDto deleteExercise(@RequestBody ExerciseDto exerciseToDelete) {
        exerciseRepository.deleteById(UUID.fromString(exerciseToDelete.exerciseId().toString()));
        return exerciseToDelete;
    }

    @GetMapping("/check/list")
    public List<CheckDto> getAllChecksForUser(Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();
        return checkRepository.findCheckByCheckIdUsername(username).stream().map(
                check -> new CheckDto(check.getCheckId().getExerciseId())
        ).toList();
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
}
