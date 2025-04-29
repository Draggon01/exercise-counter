package org.exercise.counter.exercisecounter;

import org.springframework.boot.SpringApplication;

public class TestExerciseCounterApplication {

    public static void main(String[] args) {
        SpringApplication.from(ExerciseCounterApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}
