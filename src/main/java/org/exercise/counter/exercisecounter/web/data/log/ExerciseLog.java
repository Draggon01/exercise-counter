package org.exercise.counter.exercisecounter.web.data.log;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseLog {

    @EmbeddedId
    private ExerciseLogId logId;

    @Column(nullable = false)
    private Long value;

    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
