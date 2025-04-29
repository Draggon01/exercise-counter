package org.exercise.counter.exercisecounter;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class ExerciseCounterApplicationTests {

    @Test
    void contextLoads() {
    }

}
