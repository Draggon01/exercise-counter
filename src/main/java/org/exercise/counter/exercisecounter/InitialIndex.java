package org.exercise.counter.exercisecounter;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InitialIndex {
    @GetMapping("/")
    public String index() {
        return "Hello World";
    }
}
