package org.exercise.counter.exercisecounter.web.data.streak;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExerciseStreakRepository extends JpaRepository<ExerciseStreak, ExerciseStreakId> {
    List<ExerciseStreak> findAllByExerciseStreakIdExerciseId(UUID exerciseId);
}
