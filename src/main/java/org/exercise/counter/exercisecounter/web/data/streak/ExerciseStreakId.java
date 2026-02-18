package org.exercise.counter.exercisecounter.web.data.streak;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseStreakId implements Serializable {
    private UUID exerciseId;
    private String username;
}
