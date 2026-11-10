package org.exercise.counter.exercisecounter.exercise;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibiltiy;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.exercise.ExerciseController;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ExerciseControllerTest {

    private static final String OWNER = "ex-owner";
    private static final String OTHER = "ex-other";

    @Autowired private ExerciseController exerciseController;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SchedulerService schedulerService;

    private UUID createdId;

    @BeforeEach
    void setup() {
        for (String name : List.of(OWNER, OTHER)) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}x"));
            }
        }
    }

    @AfterEach
    void cleanup() {
        if (createdId != null) {
            schedulerService.cancelSchedulerFor(createdId);
            exerciseRepository.deleteById(createdId);
        }
    }

    @Test
    void addExercise_ignoresCreatorSentByClient() {
        ExerciseDto request = new ExerciseDto(null, "Pushups", OTHER, 1, "12:00:00", 0,
                ExerciseType.NUMBERREPEAT, "10", null, Visibiltiy.PRIVATE, List.of(), null, 0);

        ExerciseDto saved = exerciseController.addExercise(request, auth(OWNER));
        createdId = saved.exerciseId();

        assertEquals(OWNER, saved.creator());
        assertEquals(OWNER, exerciseRepository.findById(createdId).orElseThrow().getCreator());
    }

    private static Authentication auth(String username) {
        UserDetails user = new org.springframework.security.core.userdetails.User(
                username, "{noop}x", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}
