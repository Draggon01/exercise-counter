package org.exercise.counter.exercisecounter.web.data.log;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExerciseLogRepository extends JpaRepository<ExerciseLog, ExerciseLogId> {
    List<ExerciseLog> findByLogIdExerciseId(UUID exerciseId);
}
