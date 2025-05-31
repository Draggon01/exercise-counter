package org.exercise.counter.exercisecounter.web.data.userselection;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.exercise.counter.exercisecounter.web.data.groups.ExerciseGroupMappingId;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
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
}
