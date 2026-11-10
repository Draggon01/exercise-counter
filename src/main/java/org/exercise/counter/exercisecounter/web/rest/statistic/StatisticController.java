package org.exercise.counter.exercisecounter.web.rest.statistic;

import org.exercise.counter.exercisecounter.web.rest.statistic.dto.MissedEntryRequestDto;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.PeriodDto;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.exercise.counter.exercisecounter.web.service.StatisticService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/statistic")
public class StatisticController {

    private final StatisticService statisticService;

    public StatisticController(StatisticService statisticService) {
        this.statisticService = statisticService;
    }

    @GetMapping("/load")
    public StatisticDto loadStatistic(@RequestParam String exerciseId) {
        return statisticService.load(UUID.fromString(exerciseId));
    }

    @GetMapping("/unfinished-periods/{exerciseId}")
    public List<PeriodDto> getUnfinishedPeriods(@PathVariable String exerciseId, @AuthenticationPrincipal UserDetails user) {
        return statisticService.unfinishedPeriods(UUID.fromString(exerciseId), user.getUsername());
    }

    @PostMapping("/add-missed-entry")
    public ResponseEntity<Void> addMissedEntry(@RequestBody MissedEntryRequestDto request, @AuthenticationPrincipal UserDetails user) {
        statisticService.addMissedEntry(request.exerciseId(), request.periodId(), user.getUsername());
        return ResponseEntity.ok().build();
    }
}
