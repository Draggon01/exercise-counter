package org.exercise.counter.exercisecounter.web.data.exercise;

import org.springframework.data.repository.CrudRepository;

import java.util.UUID;

public interface ExerciseRepository extends CrudRepository<Exercise, UUID> {
}
