package org.exercise.counter.exercisecounter.web.rest.detail;

import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseDetailsDto;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseDetailsRequest;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseStepDto;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseStepRequest;
import org.exercise.counter.exercisecounter.web.service.ExerciseDetailService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Description and steps of an exercise: read by everybody who sees it, changed by its creator. */
@RestController
@RequestMapping("/api/exercises/{exerciseId}")
public class ExerciseDetailController {

    private final ExerciseDetailService detailService;

    public ExerciseDetailController(ExerciseDetailService detailService) {
        this.detailService = detailService;
    }

    @GetMapping("/details")
    public ExerciseDetailsDto load(@PathVariable UUID exerciseId, @AuthenticationPrincipal UserDetails user) {
        return detailService.load(exerciseId, user.getUsername());
    }

    @PutMapping("/details")
    public ExerciseDetailsDto update(@PathVariable UUID exerciseId, @RequestBody ExerciseDetailsRequest request,
                                     @AuthenticationPrincipal UserDetails user) {
        return detailService.update(exerciseId, request, user.getUsername());
    }

    /** Adds a step at the end. */
    @PostMapping("/steps")
    @ResponseStatus(HttpStatus.CREATED)
    public ExerciseStepDto addStep(@PathVariable UUID exerciseId, @RequestBody ExerciseStepRequest request,
                                   @AuthenticationPrincipal UserDetails user) {
        return detailService.addStep(exerciseId, request, user.getUsername());
    }

    @PutMapping("/steps/{stepId}")
    public ExerciseStepDto updateStep(@PathVariable UUID exerciseId, @PathVariable UUID stepId,
                                      @RequestBody ExerciseStepRequest request,
                                      @AuthenticationPrincipal UserDetails user) {
        return detailService.updateStep(exerciseId, stepId, request, user.getUsername());
    }

    @DeleteMapping("/steps/{stepId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStep(@PathVariable UUID exerciseId, @PathVariable UUID stepId,
                           @AuthenticationPrincipal UserDetails user) {
        detailService.deleteStep(exerciseId, stepId, user.getUsername());
    }

    /** The ids of all steps in their new order. */
    @PutMapping("/steps/order")
    public ExerciseDetailsDto reorderSteps(@PathVariable UUID exerciseId, @RequestBody List<UUID> stepIds,
                                           @AuthenticationPrincipal UserDetails user) {
        return detailService.reorderSteps(exerciseId, stepIds, user.getUsername());
    }
}
