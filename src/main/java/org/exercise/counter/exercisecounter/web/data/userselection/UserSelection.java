package org.exercise.counter.exercisecounter.web.data.userselection;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import java.util.Objects;

@Entity(name = "show_exercise_for_user")
public class UserSelection {
    @EmbeddedId
    UserSelectionId userSelectionId;

    @ManyToOne
    @JoinColumn(name = "exercise_id", insertable = false, updatable = false)
    Exercise exercise;

    @Column(name = "position")
    Integer position;

    public UserSelection(UserSelectionId userSelectionId) {
        this.userSelectionId = userSelectionId;
        this.position = 0;
    }

    public UserSelection(UserSelectionId userSelectionId, Integer position) {
        this.userSelectionId = userSelectionId;
        this.position = position;
    }

    public UserSelection(UserSelectionId userSelectionId, Exercise exercise, Integer position) {
        this.userSelectionId = userSelectionId;
        this.exercise = exercise;
        this.position = position;
    }

    public UserSelection() {
    }

    public UserSelectionId getUserSelectionId() {
        return this.userSelectionId;
    }

    public Exercise getExercise() {
        return this.exercise;
    }

    public Integer getPosition() {
        return this.position;
    }

    public void setUserSelectionId(UserSelectionId userSelectionId) {
        this.userSelectionId = userSelectionId;
    }

    public void setExercise(Exercise exercise) {
        this.exercise = exercise;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserSelection other)) return false;
        return Objects.equals(getPosition(), other.getPosition()) &&
                Objects.equals(getUserSelectionId(), other.getUserSelectionId()) &&
                Objects.equals(getExercise(), other.getExercise());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getPosition(), getUserSelectionId(), getExercise());
    }

    @Override
    public String toString() {
        return "UserSelection(userSelectionId=" + this.getUserSelectionId() + ", exercise=" + this.getExercise() + ", position=" + this.getPosition() + ")";
    }
}
