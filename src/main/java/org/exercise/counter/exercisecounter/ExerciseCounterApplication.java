package org.exercise.counter.exercisecounter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class ExerciseCounterApplication {

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC_TIME"));
        SpringApplication.run(ExerciseCounterApplication.class, args);
    }

}
