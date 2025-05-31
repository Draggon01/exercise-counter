package org.exercise.counter.exercisecounter.web.data.groups;

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
public class ExerciseGroupMappingId implements Serializable {
    private UUID exerciseId;
    @Column(name = "group_id")
    private UUID groupId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ExerciseGroupMappingId that = (ExerciseGroupMappingId) o;
        return exerciseId.equals(that.exerciseId) && groupId.equals(that.groupId);
    }

    @Override
    public int hashCode() {
        return 31 * exerciseId.hashCode() + groupId.hashCode();
    }
}
