package org.exercise.counter.exercisecounter.web.rest.check;

import org.exercise.counter.exercisecounter.web.rest.check.dto.CheckDto;
import org.exercise.counter.exercisecounter.web.service.CheckService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** "Finished in the current period" checks of the current user. */
@RestController
@RequestMapping("/api/checks")
public class CheckController {

    private final CheckService checkService;

    public CheckController(CheckService checkService) {
        this.checkService = checkService;
    }

    /** The exercises the current user has checked. */
    @GetMapping
    public List<CheckDto> listMine(@AuthenticationPrincipal UserDetails user) {
        return checkService.listForUser(user.getUsername());
    }

    /** For every exercise on the user's home page: everybody who checked it, with streaks. */
    @GetMapping("/per-exercise")
    public Map<UUID, List<CheckDto>> listPerExercise(@AuthenticationPrincipal UserDetails user) {
        return checkService.listPerSelectedExercise(user.getUsername());
    }

    @PutMapping("/{exerciseId}")
    public CheckDto check(@PathVariable UUID exerciseId, @AuthenticationPrincipal UserDetails user) {
        checkService.check(exerciseId, user.getUsername());
        return new CheckDto(exerciseId, user.getUsername(), CheckService.STREAK_NOT_CALCULATED);
    }

    @DeleteMapping("/{exerciseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void uncheck(@PathVariable UUID exerciseId, @AuthenticationPrincipal UserDetails user) {
        checkService.uncheck(exerciseId, user.getUsername());
    }
}
