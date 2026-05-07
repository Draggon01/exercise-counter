package org.exercise.counter.exercisecounter.web.rest.statistic;

import jakarta.transaction.Transactional;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.*;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.MissedEntryRequestDto;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.PeriodDto;
import org.exercise.counter.exercisecounter.web.rest.statistic.dto.StatisticDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController()
@RequestMapping("/api")
public class StatisticController {

    private final CheckRepository checkRepository;
    private final PeriodRepository periodRepository;
    private final FinishedUserRepository finishedUserRepository;
    private final UserRepository userRepository;

    public StatisticController(
            CheckRepository checkRepository,
            PeriodRepository periodRepository,
            FinishedUserRepository finishedUserRepository,
            UserRepository userRepository) {
        this.checkRepository = checkRepository;
        this.periodRepository = periodRepository;
        this.finishedUserRepository = finishedUserRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/statistic/load")
    public StatisticDto loadStatistic(@RequestParam String exerciseId) {
        Map<String, List<String>> statistics = new HashMap<>();
        List<Period> periods = periodRepository.findByExerciseExerciseId(UUID.fromString(exerciseId));
        periods.forEach(period -> {
            List<FinishedUser> finishedUsers =
                    finishedUserRepository.findByPeriod_PeriodId(period.getPeriodId());
            List<String> list = finishedUsers.stream()
                    .map(finishedUser -> finishedUser.getUsername().getUsername()).toList();
            statistics.put(period.toKeyString(), list); //TODO make a better to Key function that also smaller periods can be shown.
        });

        Map<String, List<String>> stringListMap = generateToday(exerciseId);
        statistics.putAll(stringListMap);
        return new StatisticDto(statistics);
    }

    @GetMapping("/statistic/unfinished-periods/{exerciseId}")
    public List<PeriodDto> getUnfinishedPeriods(@PathVariable String exerciseId, Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        User user = userRepository.findByUsername(username).orElseThrow();
        List<Period> periods = periodRepository.findByExerciseExerciseId(UUID.fromString(exerciseId));
        return periods.stream()
                .filter(period -> !finishedUserRepository.existsByPeriod_PeriodIdAndUsername(period.getPeriodId(), user))
                .map(period -> new PeriodDto(period.getPeriodId(), period.toKeyString()))
                .toList();
    }

    @PostMapping("/statistic/add-missed-entry")
    @Transactional
    public ResponseEntity<Void> addMissedEntry(@RequestBody MissedEntryRequestDto request, Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        User user = userRepository.findByUsername(username).orElseThrow();
        Period period = periodRepository.findById(request.periodId()).orElseThrow();

        if (finishedUserRepository.existsByPeriod_PeriodIdAndUsername(period.getPeriodId(), user)) {
            return ResponseEntity.ok().build();
        }

        FinishedUser finishedUser = new FinishedUser();
        finishedUser.setPeriod(period);
        finishedUser.setUsername(user);
        finishedUserRepository.save(finishedUser);
        return ResponseEntity.ok().build();
    }

    private Map<String, List<String>> generateToday(String exerciseId) {
        List<String> finisher = new ArrayList<>();
        checkRepository.findCheckByCheckIdExerciseId(UUID.fromString(exerciseId))
                .forEach(check -> finisher.add(check.getCheckId().getUsername()));
        return new HashMap<>() {{
            put("current", finisher);
        }};
    }
}
