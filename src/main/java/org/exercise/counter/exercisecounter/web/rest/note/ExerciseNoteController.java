package org.exercise.counter.exercisecounter.web.rest.note;

import org.exercise.counter.exercisecounter.web.rest.note.dto.ExerciseNoteDto;
import org.exercise.counter.exercisecounter.web.service.ExerciseNoteService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** The current user's own note on an exercise. */
@RestController
@RequestMapping("/api/exercises/{exerciseId}/note")
public class ExerciseNoteController {

    private final ExerciseNoteService noteService;

    public ExerciseNoteController(ExerciseNoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public ExerciseNoteDto load(@PathVariable UUID exerciseId, @AuthenticationPrincipal UserDetails user) {
        return new ExerciseNoteDto(noteService.load(exerciseId, user.getUsername()));
    }

    /** An empty text deletes the note. */
    @PutMapping
    public ExerciseNoteDto save(@PathVariable UUID exerciseId, @RequestBody ExerciseNoteDto note,
                                @AuthenticationPrincipal UserDetails user) {
        return new ExerciseNoteDto(noteService.save(exerciseId, note.text(), user.getUsername()));
    }
}
