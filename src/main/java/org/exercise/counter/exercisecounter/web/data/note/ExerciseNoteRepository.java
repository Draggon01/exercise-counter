package org.exercise.counter.exercisecounter.web.data.note;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseNoteRepository extends JpaRepository<ExerciseNote, ExerciseNoteId> {
}
