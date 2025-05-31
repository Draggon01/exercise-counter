package org.exercise.counter.exercisecounter.web.data.groups;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExerciseGroupMappingRepository extends JpaRepository<ExerciseGroupMapping, ExerciseGroupMappingId> {

    List<ExerciseGroupMapping> findByExerciseGroupMappingId_ExerciseId(UUID exerciseGroupMappingIdExerciseId);
}
