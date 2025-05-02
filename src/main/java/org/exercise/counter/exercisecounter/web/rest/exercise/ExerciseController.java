package org.exercise.counter.exercisecounter.web.rest.exercise;

import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.StreamSupport;

@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {

    private final ExerciseRepository exerciseRepository;

    public ExerciseController(ExerciseRepository exerciseRepository) {
        this.exerciseRepository = exerciseRepository;
    }

    @GetMapping("/list")
    public List<ExerciseDto> getAllExercises() {
        return StreamSupport.stream(exerciseRepository.findAll().spliterator(), false)
                .map(exercise -> new ExerciseDto(exercise.getExerciseId(), exercise.getExerciseTitle(), exercise.getExerciseCreator()))
                .toList();
    }

    @PostMapping("/save")
    public ExerciseDto addExercise(@RequestBody ExerciseDto exercise) {
        Exercise save = exerciseRepository.save(new Exercise(exercise.exerciseId(), exercise.exerciseTitle(), exercise.creator()));
        return new ExerciseDto(save.getExerciseId(), save.getExerciseTitle(), save.getExerciseCreator());
    }

    @PostMapping("/delete")
    public ExerciseDto deleteExercise(@RequestBody ExerciseDto exerciseToDelete) {
        exerciseRepository.deleteById(UUID.fromString(exerciseToDelete.exerciseId().toString()));
        return exerciseToDelete;
    }
}
