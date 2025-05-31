package org.exercise.counter.exercisecounter.web.data.groups;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity( name = "exercise_group_mapping")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExerciseGroupMapping {
    @EmbeddedId
    ExerciseGroupMappingId exerciseGroupMappingId;

    @ManyToOne
    @JoinColumn(name = "group_id", insertable = false, updatable = false)
    private Group group;

}
