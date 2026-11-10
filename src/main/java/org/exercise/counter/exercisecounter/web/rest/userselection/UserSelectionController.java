package org.exercise.counter.exercisecounter.web.rest.userselection;

import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.service.ExerciseService;
import org.exercise.counter.exercisecounter.web.service.SelectionService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Which exercises are on the current user's home page, and in which order. */
@RestController
@RequestMapping("/api/selection")
public class UserSelectionController {

    private final SelectionService selectionService;
    private final ExerciseService exerciseService;

    public UserSelectionController(SelectionService selectionService, ExerciseService exerciseService) {
        this.selectionService = selectionService;
        this.exerciseService = exerciseService;
    }

    @PutMapping("/{exerciseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void select(@PathVariable UUID exerciseId, @AuthenticationPrincipal UserDetails user) {
        selectionService.select(exerciseId, user.getUsername());
    }

    @DeleteMapping("/{exerciseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unselect(@PathVariable UUID exerciseId, @AuthenticationPrincipal UserDetails user) {
        selectionService.unselect(exerciseId, user.getUsername());
    }

    /** Saves the new order and returns the user's exercises in that order. */
    @PutMapping("/order")
    public List<ExerciseDto> reorder(@RequestBody List<UUID> exerciseIds, @AuthenticationPrincipal UserDetails user) {
        selectionService.reorder(exerciseIds, user.getUsername());
        return exerciseService.listSelected(user.getUsername());
    }
}
