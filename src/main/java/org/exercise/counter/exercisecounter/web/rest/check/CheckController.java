package org.exercise.counter.exercisecounter.web.rest.check;

import org.exercise.counter.exercisecounter.web.rest.check.dto.CheckDto;
import org.exercise.counter.exercisecounter.web.service.CheckService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/check")
public class CheckController {

    private final CheckService checkService;

    public CheckController(CheckService checkService) {
        this.checkService = checkService;
    }

    @GetMapping("/list")
    public List<CheckDto> getAllChecksForUser(@AuthenticationPrincipal UserDetails user) {
        return checkService.listForUser(user.getUsername());
    }

    @GetMapping("/list/per/exercise")
    public Map<UUID, List<CheckDto>> getAllChecksPerExercise(@AuthenticationPrincipal UserDetails user) {
        return checkService.listPerSelectedExercise(user.getUsername());
    }

    @PostMapping("/save")
    public CheckDto addCheckForExercise(@RequestBody CheckDto checkDto, @AuthenticationPrincipal UserDetails user) {
        checkService.check(checkDto.exerciseId(), user.getUsername());
        return checkDto;
    }

    @PostMapping("/delete")
    public CheckDto removeCheckForExercise(@RequestBody CheckDto checkDto, @AuthenticationPrincipal UserDetails user) {
        checkService.uncheck(checkDto.exerciseId(), user.getUsername());
        return checkDto;
    }
}
