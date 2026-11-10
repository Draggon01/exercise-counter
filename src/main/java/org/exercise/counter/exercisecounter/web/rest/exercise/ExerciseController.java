package org.exercise.counter.exercisecounter.web.rest.exercise;

import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.service.ExerciseService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ExerciseController {

    private final ExerciseService exerciseService;

    public ExerciseController(ExerciseService exerciseService) {
        this.exerciseService = exerciseService;
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

    @GetMapping("/exercises/exercisetype")
    public Map<String, String> getExerciseTypes() {
        return ExerciseType.getAllDescriptionsAsMap();
    }

    @GetMapping("/exercises/visibility")
    public List<String> getExerciseVisibilities() {
        return Arrays.stream(Visibility.values()).map(Enum::toString).toList();
    }
}
