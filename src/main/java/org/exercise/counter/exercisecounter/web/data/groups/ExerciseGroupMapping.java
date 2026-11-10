package org.exercise.counter.exercisecounter.web.data.groups;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.util.Objects;

@Entity( name = "exercise_group_mapping")
public class ExerciseGroupMapping {
    @EmbeddedId
    ExerciseGroupMappingId exerciseGroupMappingId;

    @ManyToOne
    @JoinColumn(name = "group_id", insertable = false, updatable = false)
    private Group group;

    public ExerciseGroupMapping() {
    }

    public ExerciseGroupMapping(ExerciseGroupMappingId exerciseGroupMappingId, Group group) {
        this.exerciseGroupMappingId = exerciseGroupMappingId;
        this.group = group;
    }

    public ExerciseGroupMappingId getExerciseGroupMappingId() {
        return this.exerciseGroupMappingId;
    }

    public Group getGroup() {
        return this.group;
    }

    public void setExerciseGroupMappingId(ExerciseGroupMappingId exerciseGroupMappingId) {
        this.exerciseGroupMappingId = exerciseGroupMappingId;
    }

    public void setGroup(Group group) {
        this.group = group;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExerciseGroupMapping other)) return false;
        return Objects.equals(getExerciseGroupMappingId(), other.getExerciseGroupMappingId()) &&
                Objects.equals(getGroup(), other.getGroup());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getExerciseGroupMappingId(), getGroup());
    }

    @Override
    public String toString() {
        return "ExerciseGroupMapping(exerciseGroupMappingId=" + this.getExerciseGroupMappingId() + ", group=" + this.getGroup() + ")";
    }
}
