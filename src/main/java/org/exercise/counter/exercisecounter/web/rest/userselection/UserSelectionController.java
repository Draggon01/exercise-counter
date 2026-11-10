package org.exercise.counter.exercisecounter.web.rest.userselection;

import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.service.ExerciseService;
import org.exercise.counter.exercisecounter.web.service.SelectionService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/selection")
public class UserSelectionController {

    private final SelectionService selectionService;
    private final ExerciseService exerciseService;

    public UserSelectionController(SelectionService selectionService, ExerciseService exerciseService) {
        this.selectionService = selectionService;
        this.exerciseService = exerciseService;
    }

    @PostMapping("/select")
    public void select(@RequestBody String exerciseId, @AuthenticationPrincipal UserDetails user) {
        selectionService.select(UUID.fromString(exerciseId), user.getUsername());
    }

    @PostMapping("/unselect")
    public void unselect(@RequestBody String exerciseId, @AuthenticationPrincipal UserDetails user) {
        selectionService.unselect(UUID.fromString(exerciseId), user.getUsername());
    }

    /** Saves the new order and returns the user's exercises in that order. */
    @PostMapping("/reorder")
    public List<ExerciseDto> reorder(@RequestBody List<String> exerciseIds, @AuthenticationPrincipal UserDetails user) {
        selectionService.reorder(exerciseIds.stream().map(UUID::fromString).toList(), user.getUsername());
        return exerciseService.listSelected(user.getUsername());
    }
}
