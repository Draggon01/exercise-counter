package org.exercise.counter.exercisecounter.web.rest.statistic;

import org.exercise.counter.exercisecounter.web.rest.statistic.dto.MissedEntryRequest;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.PeriodDto;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.exercise.counter.exercisecounter.web.service.StatisticService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/statistic/{exerciseId}")
public class StatisticController {

    private final StatisticService statisticService;

    public StatisticController(StatisticService statisticService) {
        this.statisticService = statisticService;
    }

    /** Finishers per period plus "current" for the running period. */
    @GetMapping
    public StatisticDto load(@PathVariable UUID exerciseId) {
        return statisticService.load(exerciseId);
    }

    /** Past periods the current user did not finish. */
    @GetMapping("/unfinished-periods")
    public List<PeriodDto> unfinishedPeriods(@PathVariable UUID exerciseId, @AuthenticationPrincipal UserDetails user) {
        return statisticService.unfinishedPeriods(exerciseId, user.getUsername());
    }

    /** Mark a past period as finished by the current user. */
    @PostMapping("/missed-entries")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addMissedEntry(@PathVariable UUID exerciseId, @RequestBody MissedEntryRequest request,
                               @AuthenticationPrincipal UserDetails user) {
        statisticService.addMissedEntry(exerciseId, request.periodId(), user.getUsername());
    }
}
