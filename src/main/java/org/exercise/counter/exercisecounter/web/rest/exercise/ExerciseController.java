package org.exercise.counter.exercisecounter.web.rest.exercise;

import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.service.ExerciseService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {

    private final ExerciseService exerciseService;

    public ExerciseController(ExerciseService exerciseService) {
        this.exerciseService = exerciseService;
    }

    /** All exercises the current user may see. */
    @GetMapping
    public List<ExerciseDto> listVisible(@AuthenticationPrincipal UserDetails user) {
        return exerciseService.listVisible(user.getUsername());
    }

    /** The exercises on the user's home page, in their order. */
    @GetMapping("/selected")
    public List<ExerciseDto> listSelected(@AuthenticationPrincipal UserDetails user) {
        return exerciseService.listSelected(user.getUsername());
    }

    /** Visible exercises not yet on the user's home page. */
    @GetMapping("/available")
    public List<ExerciseDto> listAvailable(@AuthenticationPrincipal UserDetails user) {
        return exerciseService.listAvailable(user.getUsername());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExerciseDto create(@RequestBody ExerciseDto exercise, @AuthenticationPrincipal UserDetails user) {
        return exerciseService.save(withId(exercise, null), user.getUsername());
    }

    @PutMapping("/{exerciseId}")
    public ExerciseDto update(@PathVariable UUID exerciseId, @RequestBody ExerciseDto exercise,
                              @AuthenticationPrincipal UserDetails user) {
        return exerciseService.save(withId(exercise, exerciseId), user.getUsername());
    }

    @DeleteMapping("/{exerciseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID exerciseId, @AuthenticationPrincipal UserDetails user) {
        exerciseService.delete(exerciseId, user.getUsername());
    }

    /** Exercise type → description. */
    @GetMapping("/types")
    public Map<String, String> types() {
        return ExerciseType.getAllDescriptionsAsMap();
    }

    @GetMapping("/visibilities")
    public List<String> visibilities() {
        return Arrays.stream(Visibility.values()).map(Enum::toString).toList();
    }

    /** The id in the URL wins over an id in the body (null for create). */
    private static ExerciseDto withId(ExerciseDto dto, UUID exerciseId) {
        return new ExerciseDto(exerciseId, dto.exerciseTitle(), dto.creator(), dto.daysRepeat(), dto.startTime(),
                dto.utcOffset(), dto.timeZone(), dto.exerciseType(), dto.exerciseValue(), dto.exerciseIncrease(), dto.visibility(),
                dto.groups(), dto.timeLeftSeconds(), dto.position());
    }
}
