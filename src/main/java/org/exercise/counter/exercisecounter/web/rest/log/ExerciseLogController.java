package org.exercise.counter.exercisecounter.web.rest.log;

import org.exercise.counter.exercisecounter.web.data.log.ExerciseLog;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogId;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/log")
public class ExerciseLogController {

    private final ExerciseLogRepository exerciseLogRepository;

    public ExerciseLogController(ExerciseLogRepository exerciseLogRepository) {
        this.exerciseLogRepository = exerciseLogRepository;
    }

    @GetMapping("/{exerciseId}")
    public ResponseEntity<Map<String, Long>> getLog(
            @PathVariable UUID exerciseId,
            Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        Optional<ExerciseLog> log = exerciseLogRepository.findById(new ExerciseLogId(exerciseId, username));
        return log
                .map(l -> ResponseEntity.ok(Map.of("value", l.getValue())))
                .orElse(ResponseEntity.ok(Map.of()));
    }

    @PostMapping("/save")
    public ResponseEntity<Void> saveLog(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        UUID exerciseId = UUID.fromString(body.get("exerciseId").toString());
        long value = Long.parseLong(body.get("value").toString());

        ExerciseLogId logId = new ExerciseLogId(exerciseId, username);
        exerciseLogRepository.save(new ExerciseLog(logId, value, LocalDateTime.now()));
        return ResponseEntity.ok().build();
    }
}
