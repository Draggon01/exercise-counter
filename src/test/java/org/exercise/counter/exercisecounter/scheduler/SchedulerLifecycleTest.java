package org.exercise.counter.exercisecounter.scheduler;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibiltiy;
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
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SchedulerLifecycleTest {

    @Autowired
    private SchedulerService schedulerService;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private ExerciseController exerciseController;

    @Autowired
    private UserRepository userRepository;

    private Exercise exercise;

    @BeforeEach
    void setup() {
        if (userRepository.findByUsername("lifecycleuser").isEmpty()) {
            userRepository.save(new org.exercise.counter.exercisecounter.web.data.user.User("lifecycleuser", "{noop}x"));
        }
        exercise = new Exercise();
        exercise.setExerciseTitle("Lifecycle");
        exercise.setCreator("lifecycleuser");
        exercise.setDaysRepeat(1);
        exercise.setStartTime(LocalTime.of(0, 0));
        exercise.setUtcOffset(0);
        exercise.setExerciseType(ExerciseType.NUMBERREPEAT);
        exercise.setExerciseValue("10");
        exercise.setVisibility(Visibiltiy.PUBLIC);
        exercise = exerciseRepository.save(exercise);
    }

    @AfterEach
    void cleanup() {
        schedulerService.cancelSchedulerFor(exercise.getExerciseId());
        if (exerciseRepository.existsById(exercise.getExerciseId())) {
            exerciseRepository.deleteById(exercise.getExerciseId());
        }
    }

    @Test
    void deletingExercise_cancelsItsScheduler() {
        schedulerService.restartSchedulerFor(exercise);
        assertTrue(schedulerService.isScheduled(exercise.getExerciseId()));

        exerciseController.deleteExercise(toDto(exercise), auth("lifecycleuser"));

        assertFalse(schedulerService.isScheduled(exercise.getExerciseId()),
                "Scheduler must be cancelled after the exercise was deleted");
        assertFalse(exerciseRepository.existsById(exercise.getExerciseId()));
    }

    @Test
    void cancelSchedulerFor_unknownExercise_doesNothing() {
        schedulerService.cancelSchedulerFor(java.util.UUID.randomUUID());
    }

    private static ExerciseDto toDto(Exercise e) {
        return new ExerciseDto(e.getExerciseId(), e.getExerciseTitle(), e.getCreator(), e.getDaysRepeat(),
                "00:00:00", e.getUtcOffset(), e.getExerciseType(), e.getExerciseValue(),
                e.getExerciseIncrease(), e.getVisibility(), List.of(), 0L, null);
    }

    private static Authentication auth(String username) {
        UserDetails user = new User(username, "{noop}x", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        return new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
    }
}
