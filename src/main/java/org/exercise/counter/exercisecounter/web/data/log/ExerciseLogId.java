package org.exercise.counter.exercisecounter.web.data.log;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseLogId implements Serializable {

    @Column(name = "exercise_id")
    private UUID exerciseId;

    @Column(name = "username")
    private String username;
}
