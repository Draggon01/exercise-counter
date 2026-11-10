package org.exercise.counter.exercisecounter.web.data.checks;

import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
public class CheckId implements Serializable {

    private UUID exerciseId;
    private String username;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CheckId checkId = (CheckId) o;
        return exerciseId.equals(checkId.exerciseId) && username.equals(checkId.username);
    }

    @Override
    public int hashCode() {
        return 31 * exerciseId.hashCode() + username.hashCode();
    }

    public CheckId() {
    }

    public CheckId(UUID exerciseId, String username) {
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
    public String toString() {
        return "CheckId(exerciseId=" + this.getExerciseId() + ", username=" + this.getUsername() + ")";
    }
}
