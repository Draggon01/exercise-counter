package org.exercise.counter.exercisecounter.web.data.detail;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ExerciseDetailRepository extends JpaRepository<ExerciseDetail, UUID> {
}
