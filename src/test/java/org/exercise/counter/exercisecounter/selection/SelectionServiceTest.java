package org.exercise.counter.exercisecounter.selection;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.service.SelectionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SelectionServiceTest {

    private static final String USER = "sel-user";

    @Autowired private SelectionService selectionService;
    @Autowired private UserSelectionRepository userSelectionRepository;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private UserRepository userRepository;

    private final List<Exercise> exercises = new ArrayList<>();

    @BeforeEach
    void setup() {
        if (userRepository.findByUsername(USER).isEmpty()) {
            userRepository.save(new User(USER, "{noop}x"));
        }
        for (String title : List.of("a", "b", "c")) {
            Exercise e = new Exercise();
            e.setExerciseTitle(title);
            e.setCreator(USER);
            e.setDaysRepeat(1);
            e.setStartTime(LocalTime.NOON);
            e.setUtcOffset(0);
            e.setExerciseType(ExerciseType.NUMBERREPEAT);
            e.setExerciseValue("1");
            e.setVisibility(Visibility.PRIVATE);
            exercises.add(exerciseRepository.save(e));
        }
    }

    @AfterEach
    void cleanup() {
        exerciseRepository.deleteAll(exercises); // cascades selections
        exercises.clear();
    }

    @Test
    void select_appendsAtTheEnd() {
        exercises.forEach(e -> selectionService.select(e.getExerciseId(), USER));

        assertEquals(List.of(id(0), id(1), id(2)), orderedIds());
        assertEquals(List.of(0, 1, 2), positions());
    }

    @Test
    void unselect_closesTheGap() {
        exercises.forEach(e -> selectionService.select(e.getExerciseId(), USER));

        selectionService.unselect(id(1), USER);

        assertEquals(List.of(id(0), id(2)), orderedIds());
        assertEquals(List.of(0, 1), positions());
    }

    @Test
    void reorder_followsGivenOrder_andIgnoresUnknownIds() {
        exercises.forEach(e -> selectionService.select(e.getExerciseId(), USER));

        selectionService.reorder(List.of(id(2), UUID.randomUUID(), id(0), id(1)), USER);

        assertEquals(List.of(id(2), id(0), id(1)), orderedIds());
    }

    private UUID id(int index) {
        return exercises.get(index).getExerciseId();
    }

    private List<UUID> orderedIds() {
        return userSelectionRepository.findByUserSelectionId_UsernameOrderByPositionAsc(USER).stream()
                .map(s -> s.getUserSelectionId().getExerciseId()).toList();
    }

    private List<Integer> positions() {
        return userSelectionRepository.findByUserSelectionId_UsernameOrderByPositionAsc(USER).stream()
                .map(UserSelection::getPosition).toList();
    }
}
