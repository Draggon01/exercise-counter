package org.exercise.counter.exercisecounter.web.data.userselection;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;

@Entity(name = "show_exercise_for_user")
@Data
@AllArgsConstructor
@NoArgsConstructor
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
}
