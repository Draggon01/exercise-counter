package org.exercise.counter.exercisecounter.web.data.detail;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseStepRepository extends JpaRepository<ExerciseStep, UUID> {

    List<ExerciseStep> findByExerciseIdOrderByPosition(UUID exerciseId);

    /** Only if the step belongs to the exercise. */
    Optional<ExerciseStep> findByStepIdAndExerciseId(UUID stepId, UUID exerciseId);
}
