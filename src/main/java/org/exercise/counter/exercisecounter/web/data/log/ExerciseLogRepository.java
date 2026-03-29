package org.exercise.counter.exercisecounter.web.data.log;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ExerciseLogRepository extends JpaRepository<ExerciseLog, ExerciseLogId> {
}
