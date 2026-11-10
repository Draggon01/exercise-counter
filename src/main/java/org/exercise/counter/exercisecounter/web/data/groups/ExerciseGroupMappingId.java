package org.exercise.counter.exercisecounter.web.data.groups;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
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

    public ExerciseGroupMappingId() {
    }

    public ExerciseGroupMappingId(UUID exerciseId, UUID groupId) {
        this.exerciseId = exerciseId;
        this.groupId = groupId;
    }

    public UUID getExerciseId() {
        return this.exerciseId;
    }

    public UUID getGroupId() {
        return this.groupId;
    }

    public void setExerciseId(UUID exerciseId) {
        this.exerciseId = exerciseId;
    }

    public void setGroupId(UUID groupId) {
        this.groupId = groupId;
    }

    @Override
    public String toString() {
        return "ExerciseGroupMappingId(exerciseId=" + this.getExerciseId() + ", groupId=" + this.getGroupId() + ")";
    }
}
