package org.exercise.counter.exercisecounter.detail;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.detail.ExerciseStepRepository;
import org.exercise.counter.exercisecounter.web.data.detail.GuidedMode;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseDetailsRequest;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseStepDto;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseStepRequest;
import org.exercise.counter.exercisecounter.web.rest.error.ForbiddenException;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.exercise.counter.exercisecounter.web.service.ExerciseDetailService;
import org.exercise.counter.exercisecounter.web.service.ExerciseService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ExerciseDetailServiceTest {

    private static final String ALICE = "detail-alice"; // creator
    private static final String BOB = "detail-bob";

    @Autowired private ExerciseDetailService detailService;
    @Autowired private ExerciseService exerciseService;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private ExerciseStepRepository stepRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SchedulerService schedulerService;

    private UUID publicId;
    private UUID privateId;

    @BeforeEach
    void setup() {
        for (String name : List.of(ALICE, BOB)) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}x"));
            }
        }
        publicId = exercise(Visibility.PUBLIC);
        privateId = exercise(Visibility.PRIVATE);
    }

    @AfterEach
    void cleanup() {
        List.of(publicId, privateId).forEach(id -> {
            schedulerService.cancelSchedulerFor(id);
            if (exerciseRepository.existsById(id)) exerciseRepository.deleteById(id);
        });
    }

    @Test
    void withoutDetails_everythingIsEmpty() {
        var details = detailService.load(publicId, BOB);

        assertEquals("", details.description());
        assertEquals(GuidedMode.OFF, details.guidedMode());
        assertEquals(List.of(), details.steps());
    }

    @Test
    void update_changesOnlyWhatIsSet() {
        detailService.update(publicId, new ExerciseDetailsRequest("  Slow\nand steady ", null), ALICE);
        detailService.update(publicId, new ExerciseDetailsRequest(null, GuidedMode.SHUFFLED), ALICE);

        var details = detailService.load(publicId, BOB);
        assertEquals("Slow\nand steady", details.description());
        assertEquals(GuidedMode.SHUFFLED, details.guidedMode());
    }

    @Test
    void onlyTheCreatorChanges_othersReadWhatTheySee() {
        UUID step = add("Wall sit").stepId();
        for (Executable change : List.<Executable>of(
                () -> detailService.update(publicId, new ExerciseDetailsRequest("x", null), BOB),
                () -> detailService.addStep(publicId, request("x"), BOB),
                () -> detailService.updateStep(publicId, step, request("x"), BOB),
                () -> detailService.deleteStep(publicId, step, BOB),
                () -> detailService.reorderSteps(publicId, List.of(step), BOB))) {
            assertThrows(ForbiddenException.class, change);
        }
        assertEquals("Wall sit", detailService.load(publicId, BOB).steps().getFirst().title());
        assertThrows(NotFoundException.class, () -> detailService.load(privateId, BOB));
        assertThrows(NotFoundException.class, () -> detailService.addStep(privateId, request("x"), BOB));
    }

    @Test
    void steps_areAddedChangedOrderedAndDeleted() {
        ExerciseStepDto a = add("a");
        ExerciseStepDto b = add("b");
        ExerciseStepDto c = add("c");

        detailService.updateStep(publicId, b.stepId(), new ExerciseStepRequest("b2", "Back flat", 3, null, 30, 15), ALICE);
        var details = detailService.reorderSteps(publicId, List.of(c.stepId(), a.stepId(), b.stepId()), ALICE);
        assertEquals(List.of("c", "a", "b2"), titles(details.steps()));
        assertEquals(new ExerciseStepDto(b.stepId(), "b2", "Back flat", 3, null, 30, 15), details.steps().getLast());

        detailService.deleteStep(publicId, a.stepId(), ALICE);
        add("d");
        assertEquals(List.of("c", "b2", "d"), titles(detailService.load(publicId, ALICE).steps()));
    }

    @Test
    void stepOfAnotherExercise_isNotFound() {
        UUID foreign = detailService.addStep(privateId, request("other"), ALICE).stepId();

        assertThrows(NotFoundException.class, () -> detailService.updateStep(publicId, foreign, request("x"), ALICE));
        assertThrows(NotFoundException.class, () -> detailService.deleteStep(publicId, foreign, ALICE));
        assertBadRequest(() -> detailService.reorderSteps(publicId, List.of(foreign), ALICE));
    }

    @Test
    void reorder_needsExactlyTheStepsOfTheExercise() {
        UUID a = add("a").stepId();
        UUID b = add("b").stepId();

        assertBadRequest(() -> detailService.reorderSteps(publicId, List.of(a), ALICE));
        assertBadRequest(() -> detailService.reorderSteps(publicId, List.of(a, a), ALICE));
        assertBadRequest(() -> detailService.reorderSteps(publicId, List.of(a, b, b), ALICE));
    }

    @Test
    void limits() {
        assertBadRequest(() -> detailService.update(publicId, new ExerciseDetailsRequest("x".repeat(2001), null), ALICE));
        for (ExerciseStepRequest bad : List.of(
                request(" "), request(null), request("x".repeat(81)),
                new ExerciseStepRequest("x", "x".repeat(501), null, null, null, null),
                new ExerciseStepRequest("x", null, 0, null, null, null),
                new ExerciseStepRequest("x", null, null, 1000, null, null),
                new ExerciseStepRequest("x", null, null, null, 3601, null),
                new ExerciseStepRequest("x", null, null, null, null, -1),
                new ExerciseStepRequest("x", null, 3, 12, 30, null))) {
            assertBadRequest(() -> detailService.addStep(publicId, bad, ALICE));
        }
        for (int i = 0; i < ExerciseDetailService.MAX_STEPS; i++) add("step " + i);
        assertBadRequest(() -> add("one too many"));
    }

    @Test
    void changes_neverTouchTheSchedule_andEditingTheExerciseKeepsTheDetails() {
        Exercise exercise = exerciseRepository.findById(publicId).orElseThrow();
        LocalDateTime lastRun = LocalDateTime.of(2026, 11, 20, 12, 0);
        exercise.setLastSchedulerRun(lastRun);
        exercise = exerciseRepository.save(exercise);
        assertFalse(schedulerService.isScheduled(publicId));

        detailService.update(publicId, new ExerciseDetailsRequest("text", GuidedMode.ORDERED), ALICE);
        UUID step = add("a").stepId();
        detailService.updateStep(publicId, step, request("b"), ALICE);

        assertEquals(lastRun, exerciseRepository.findById(publicId).orElseThrow().getLastSchedulerRun());
        assertFalse(schedulerService.isScheduled(publicId), "not restarted");

        exerciseService.save(exerciseService.get(publicId, ALICE), ALICE);
        assertEquals("text", detailService.load(publicId, ALICE).description());
        assertEquals(List.of("b"), titles(detailService.load(publicId, ALICE).steps()));
    }

    @Test
    void deletingTheExercise_removesTheDetails() {
        detailService.update(publicId, new ExerciseDetailsRequest("text", null), ALICE);
        UUID step = add("a").stepId();

        exerciseService.delete(publicId, ALICE);

        assertFalse(stepRepository.existsById(step));
    }

    private ExerciseStepDto add(String title) {
        return detailService.addStep(publicId, request(title), ALICE);
    }

    private static ExerciseStepRequest request(String title) {
        return new ExerciseStepRequest(title, null, null, null, null, null);
    }

    private static List<String> titles(List<ExerciseStepDto> steps) {
        return steps.stream().map(ExerciseStepDto::title).toList();
    }

    private static void assertBadRequest(Executable executable) {
        assertEquals(400, assertThrows(ResponseStatusException.class, executable).getStatusCode().value());
    }

    private UUID exercise(Visibility visibility) {
        Exercise e = new Exercise();
        e.setExerciseTitle("Knee");
        e.setCreator(ALICE);
        e.setDaysRepeat(1);
        e.setStartTime(LocalTime.NOON);
        e.setUtcOffset(0);
        e.setExerciseType(ExerciseType.TIMEREPEAT);
        e.setExerciseValue("1200");
        e.setVisibility(visibility);
        return exerciseRepository.save(e).getExerciseId();
    }
}
