package org.exercise.counter.exercisecounter.web.data.userselection;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import org.exercise.counter.exercisecounter.web.data.groups.ExerciseGroupMappingId;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
public class UserSelectionId implements Serializable {
    String username;
    @Column(name = "exercise_id")
    UUID exerciseId;

    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserSelectionId that = (UserSelectionId) o;
        return exerciseId.equals(that.exerciseId) && username.equals(that.username);
    }

    @Override
    public int hashCode() {
        return 31 * exerciseId.hashCode() + username.hashCode();
    }

    public UserSelectionId() {
    }

    public UserSelectionId(String username, UUID exerciseId) {
        this.username = username;
        this.exerciseId = exerciseId;
    }

    public String getUsername() {
        return this.username;
    }

    public UUID getExerciseId() {
        return this.exerciseId;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setExerciseId(UUID exerciseId) {
        this.exerciseId = exerciseId;
    }

    @Override
    public String toString() {
        return "UserSelectionId(username=" + this.getUsername() + ", exerciseId=" + this.getExerciseId() + ")";
    }
}
