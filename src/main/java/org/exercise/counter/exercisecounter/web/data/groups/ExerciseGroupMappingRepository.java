package org.exercise.counter.exercisecounter.web.data.groups;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ExerciseGroupMappingRepository extends JpaRepository<ExerciseGroupMapping, ExerciseGroupMappingId> {

    List<ExerciseGroupMapping> findByExerciseGroupMappingId_ExerciseId(UUID exerciseGroupMappingIdExerciseId);

    /** All mappings with their group in one query. */
    @Query("select m from exercise_group_mapping m join fetch m.group")
    List<ExerciseGroupMapping> findAllWithGroup();
}
