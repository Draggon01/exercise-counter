package org.exercise.counter.exercisecounter.web.rest.log;

import org.exercise.counter.exercisecounter.web.data.log.ExerciseLog;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogId;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogRepository;
import org.exercise.counter.exercisecounter.web.rest.log.dto.ExerciseLogDto;
import org.exercise.counter.exercisecounter.web.rest.log.dto.ExerciseLogRequest;
import org.exercise.counter.exercisecounter.web.service.ExerciseAccess;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Progress of the current period (timer seconds or reps) per user and exercise.
 */
@RestController
@RequestMapping("/api/log")
public class ExerciseLogController {

    private final ExerciseLogRepository exerciseLogRepository;
    private final ExerciseAccess exerciseAccess;

    public ExerciseLogController(ExerciseLogRepository exerciseLogRepository, ExerciseAccess exerciseAccess) {
        this.exerciseAccess = exerciseAccess;
        this.exerciseLogRepository = exerciseLogRepository;
    }

    /** The current user's saved progress of all exercises: exercise id → seconds or reps. */
    @GetMapping
    public Map<UUID, Long> listLogs(@AuthenticationPrincipal UserDetails user) {
        return exerciseLogRepository.findByLogIdUsername(user.getUsername()).stream()
                .collect(Collectors.toMap(log -> log.getLogId().getExerciseId(), ExerciseLog::getValue));
    }

    @GetMapping("/{exerciseId}")
    public ExerciseLogDto getLog(@PathVariable UUID exerciseId, @AuthenticationPrincipal UserDetails user) {
        exerciseAccess.requireVisible(exerciseId, user.getUsername());
        return exerciseLogRepository.findById(new ExerciseLogId(exerciseId, user.getUsername()))
                .map(log -> new ExerciseLogDto(log.getValue()))
                .orElse(new ExerciseLogDto(null));
    }

    @PutMapping("/{exerciseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveLog(@PathVariable UUID exerciseId, @RequestBody ExerciseLogRequest request,
                        @AuthenticationPrincipal UserDetails user) {
        exerciseAccess.requireVisible(exerciseId, user.getUsername());
        ExerciseLogId logId = new ExerciseLogId(exerciseId, user.getUsername());
        exerciseLogRepository.save(new ExerciseLog(logId, request.value(), LocalDateTime.now()));
    }
}
