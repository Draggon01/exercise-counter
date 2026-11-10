package org.exercise.counter.exercisecounter.web.data.log;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.UUID;
import java.util.Objects;

@Embeddable
public class ExerciseLogId implements Serializable {

    @Column(name = "exercise_id")
    private UUID exerciseId;

    @Column(name = "username")
    private String username;

    public ExerciseLogId() {
    }

    public ExerciseLogId(UUID exerciseId, String username) {
        this.exerciseId = exerciseId;
        this.username = username;
    }

    public UUID getExerciseId() {
        return this.exerciseId;
    }

    public String getUsername() {
        return this.username;
    }

    public void setExerciseId(UUID exerciseId) {
        this.exerciseId = exerciseId;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExerciseLogId other)) return false;
        return Objects.equals(getExerciseId(), other.getExerciseId()) &&
                Objects.equals(getUsername(), other.getUsername());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getExerciseId(), getUsername());
    }

    @Override
    public String toString() {
        return "ExerciseLogId(exerciseId=" + this.getExerciseId() + ", username=" + this.getUsername() + ")";
    }
}
