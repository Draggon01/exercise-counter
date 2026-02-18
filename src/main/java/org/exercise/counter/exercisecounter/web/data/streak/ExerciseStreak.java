package org.exercise.counter.exercisecounter.web.data.streak;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "exercise_streak")
@Data
@NoArgsConstructor
@AllArgsConstructor
@IdClass(ExerciseStreakId.class)
public class ExerciseStreak {
    @Id
    @Column(name = "exercise_id")
    private UUID exerciseId;

    @Id
    @Column(name = "username")
    private String username;

    @Column
    private Integer streak;
}
