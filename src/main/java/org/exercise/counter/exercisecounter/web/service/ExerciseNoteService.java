package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.note.ExerciseNote;
import org.exercise.counter.exercisecounter.web.data.note.ExerciseNoteId;
import org.exercise.counter.exercisecounter.web.data.note.ExerciseNoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Personal notes: everybody has their own on every exercise they see, nobody sees those of others. */
@Service
public class ExerciseNoteService {

    public static final int MAX_LENGTH = 1000;

    private final ExerciseNoteRepository noteRepository;
    private final ExerciseAccess exerciseAccess;

    public ExerciseNoteService(ExerciseNoteRepository noteRepository, ExerciseAccess exerciseAccess) {
        this.noteRepository = noteRepository;
        this.exerciseAccess = exerciseAccess;
    }

    /** The user's note, empty if there is none. */
    @Transactional(readOnly = true)
    public String load(UUID exerciseId, String username) {
        exerciseAccess.requireVisible(exerciseId, username);
        return noteRepository.findById(new ExerciseNoteId(exerciseId, username)).map(ExerciseNote::getText).orElse("");
    }

    /** An empty text deletes the note. */
    @Transactional
    public String save(UUID exerciseId, String text, String username) {
        exerciseAccess.requireVisible(exerciseId, username);
        ExerciseNoteId id = new ExerciseNoteId(exerciseId, username);
        String note = PlainText.clean("The note", text, MAX_LENGTH);
        if (note.isEmpty()) {
            noteRepository.deleteById(id);
        } else {
            noteRepository.save(new ExerciseNote(id, note));
        }
        return note;
    }
}
