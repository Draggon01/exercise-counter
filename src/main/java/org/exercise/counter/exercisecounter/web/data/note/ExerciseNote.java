package org.exercise.counter.exercisecounter.web.data.note;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** A user's own note on an exercise; nobody else sees it. */
@Entity
@Table(name = "exercise_note")
public class ExerciseNote {

    @EmbeddedId
    private ExerciseNoteId id;

    @Column(nullable = false)
    private String text;

    public ExerciseNote() {
    }

    public ExerciseNote(ExerciseNoteId id, String text) {
        this.id = id;
        this.text = text;
    }

    public ExerciseNoteId getId() {
        return id;
    }

    public String getText() {
        return text;
    }
}
