package org.exercise.counter.exercisecounter.account;

import io.hypersistence.utils.hibernate.type.range.Range;
import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.groups.GroupRepository;
import org.exercise.counter.exercisecounter.web.data.groups.GroupVisibility;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLog;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogId;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogRepository;
import org.exercise.counter.exercisecounter.web.data.options.UserOptions;
import org.exercise.counter.exercisecounter.web.data.options.UserOptionsRepository;
import org.exercise.counter.exercisecounter.web.data.push.PushSubscription;
import org.exercise.counter.exercisecounter.web.data.push.PushSubscriptionRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUser;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.exercise.counter.exercisecounter.web.service.AccountDeletionService;
import org.exercise.counter.exercisecounter.web.service.GroupService;
import org.exercise.counter.exercisecounter.web.data.detail.ExerciseStepRepository;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseDetailsRequest;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseStepRequest;
import org.exercise.counter.exercisecounter.web.data.note.ExerciseNoteId;
import org.exercise.counter.exercisecounter.web.data.note.ExerciseNoteRepository;
import org.exercise.counter.exercisecounter.web.service.ExerciseDetailService;
import org.exercise.counter.exercisecounter.web.service.ExerciseNoteService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class AccountDeletionTest {

    private static final String LEO = "del-leo";
    private static final String ANNA = "del-anna";
    private static final String BEN = "del-ben";
    private static final String PASSWORD = "secret-password";

    @Autowired private AccountDeletionService deletionService;
    @Autowired private GroupService groupService;
    @Autowired private SchedulerService schedulerService;
    @Autowired private UserRepository userRepository;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private UserSelectionRepository selectionRepository;
    @Autowired private PeriodRepository periodRepository;
    @Autowired private FinishedUserRepository finishedUserRepository;
    @Autowired private CheckRepository checkRepository;
    @Autowired private ExerciseNoteService noteService;
    @Autowired private ExerciseNoteRepository noteRepository;
    @Autowired private ExerciseDetailService detailService;
    @Autowired private ExerciseStepRepository stepRepository;
    @Autowired private ExerciseLogRepository logRepository;
    @Autowired private UserOptionsRepository optionsRepository;
    @Autowired private PushSubscriptionRepository subscriptionRepository;
    @Autowired private GroupRepository groupRepository;

    private final List<UUID> exercises = new ArrayList<>();
    private int periods;

    @BeforeEach
    void setup() {
        for (String name : List.of(LEO, ANNA, BEN)) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}" + PASSWORD));
            }
        }
    }

    @AfterEach
    void cleanup() {
        exercises.forEach(schedulerService::cancelSchedulerFor);
        exercises.stream().filter(exerciseRepository::existsById).forEach(exerciseRepository::deleteById);
        exercises.clear();
        for (String name : List.of(LEO, ANNA, BEN)) {
            userRepository.findByUsername(name).ifPresent(user -> {
                groupService.leave("del-group-solo", name);
                groupService.leave("del-group-shared", name);
                checkRepository.deleteAll(checkRepository.findCheckByCheckIdUsername(name));
                optionsRepository.deleteById(name);
                userRepository.delete(user);
            });
        }
    }

    @Test
    void exerciseOnlyTheUserUsed_isDeleted() {
        Exercise solo = exercise("Solo plank");
        onHomeList(LEO, solo);
        period(solo, LEO);
        detailService.addStep(solo.getExerciseId(), step("Hold"), LEO);

        var result = deletionService.deleteAccount(LEO, PASSWORD);

        assertEquals(List.of(solo.getExerciseId()), result.deleted());
        assertFalse(exerciseRepository.existsById(solo.getExerciseId()));
        assertTrue(stepRepository.findByExerciseIdOrderByPosition(solo.getExerciseId()).isEmpty());
        assertFalse(schedulerService.isScheduled(solo.getExerciseId()), "scheduler stopped");
        assertTrue(userRepository.findByUsername(LEO).isEmpty());
    }

    @Test
    void sharedExercise_goesToTheMostActiveOtherUser() {
        Exercise pushUps = exercise("Push-ups");
        onHomeList(LEO, pushUps);
        onHomeList(ANNA, pushUps);
        onHomeList(BEN, pushUps);
        period(pushUps, LEO, ANNA, BEN);
        period(pushUps, LEO, BEN);
        period(pushUps, BEN);
        detailService.update(pushUps.getExerciseId(), new ExerciseDetailsRequest("Elbows in", null), LEO);
        detailService.addStep(pushUps.getExerciseId(), step("Warm up"), LEO);

        var result = deletionService.deleteAccount(LEO, PASSWORD);

        assertEquals(Map.of(pushUps.getExerciseId(), BEN), result.handedOver());
        Exercise kept = exerciseRepository.findById(pushUps.getExerciseId()).orElseThrow();
        assertEquals(BEN, kept.getCreator());
        assertEquals("Elbows in", detailService.load(kept.getExerciseId(), BEN).description());
        assertEquals("Warm up", detailService.load(kept.getExerciseId(), BEN).steps().getFirst().title());
        assertTrue(schedulerService.isScheduled(kept.getExerciseId()), "keeps running for the others");
        assertEquals(List.of(ANNA, BEN), selectionRepository.findUsernamesByExerciseId(kept.getExerciseId()));
        assertTrue(finishedUserRepository.findFinishersByExerciseIds(List.of(kept.getExerciseId())).stream()
                .noneMatch(f -> f.username().equals(LEO)), "own statistics are gone");
    }

    @Test
    void someoneWhoOnlyHasItOnTheHomeList_alsoGetsIt() {
        Exercise squats = exercise("Squats");
        onHomeList(LEO, squats);
        onHomeList(ANNA, squats);

        var result = deletionService.deleteAccount(LEO, PASSWORD);

        assertEquals(Map.of(squats.getExerciseId(), ANNA), result.handedOver());
    }

    @Test
    void wrongPassword_deletesNothing() {
        Exercise solo = exercise("Solo plank");

        var error = assertThrows(ResponseStatusException.class, () -> deletionService.deleteAccount(LEO, "wrong"));

        assertEquals(400, error.getStatusCode().value());
        assertTrue(userRepository.findByUsername(LEO).isPresent());
        assertTrue(exerciseRepository.existsById(solo.getExerciseId()));
    }

    @Test
    void personalDataIsRemoved_andGroupsWithoutMembersAreDeleted() {
        Exercise anna = exercise("Anna's run");
        anna.setCreator(ANNA);
        exerciseRepository.save(anna);
        onHomeList(LEO, anna);
        checkRepository.save(new Check(new CheckId(anna.getExerciseId(), LEO)));
        logRepository.save(new ExerciseLog(new ExerciseLogId(anna.getExerciseId(), LEO), 5L, LocalDateTime.now()));
        noteService.save(anna.getExerciseId(), "mine", LEO);
        optionsRepository.save(new UserOptions(LEO, false));
        subscriptionRepository.save(new PushSubscription("https://fcm.googleapis.com/fcm/send/del-leo", LEO, "k", "a", LocalDateTime.now()));
        groupService.create("del-group-solo", GroupVisibility.INVITE_ONLY, LEO);
        groupService.create("del-group-shared", GroupVisibility.PUBLIC, LEO);
        groupService.joinPublic("del-group-shared", ANNA);

        deletionService.deleteAccount(LEO, PASSWORD);

        assertTrue(selectionRepository.findById(new UserSelectionId(LEO, anna.getExerciseId())).isEmpty());
        assertTrue(checkRepository.findCheckByCheckIdUsername(LEO).isEmpty());
        assertTrue(logRepository.findByLogIdExerciseId(anna.getExerciseId()).isEmpty());
        assertFalse(noteRepository.existsById(new ExerciseNoteId(anna.getExerciseId(), LEO)));
        assertFalse(optionsRepository.existsById(LEO));
        assertTrue(subscriptionRepository.findByUsername(LEO).isEmpty());
        assertTrue(groupRepository.findByGroupName("del-group-solo").isEmpty(), "nobody left");
        assertFalse(groupRepository.findByGroupName("del-group-shared").isEmpty(), "Anna is still in it");
        assertEquals(ANNA, exerciseRepository.findById(anna.getExerciseId()).orElseThrow().getCreator());
    }

    @Test
    void heir_prefersMostFinished_thenHomeList_thenName() {
        assertEquals(Optional.of("ben"), AccountDeletionService.heir("leo",
                Map.of("leo", 9L, "anna", 2L, "ben", 3L), Set.of("anna"), Set.of()));
        assertEquals(Optional.of("anna"), AccountDeletionService.heir("leo",
                Map.of("anna", 2L, "ben", 2L), Set.of("anna"), Set.of()));
        assertEquals(Optional.of("anna"), AccountDeletionService.heir("leo",
                Map.of(), Set.of("leo", "ben", "anna"), Set.of()));
        assertEquals(Optional.of("carl"), AccountDeletionService.heir("leo",
                Map.of(), Set.of("leo"), Set.of("carl")), "started it today");
        assertEquals(Optional.empty(), AccountDeletionService.heir("leo",
                Map.of("leo", 4L), Set.of("leo"), Set.of("leo")));
    }

    // ---- helpers

    private static ExerciseStepRequest step(String title) {
        return new ExerciseStepRequest(title, null, null, null, null, null);
    }

    private Exercise exercise(String title) {
        Exercise e = new Exercise();
        e.setExerciseTitle(title);
        e.setCreator(LEO);
        e.setDaysRepeat(1);
        e.setStartTime(LocalTime.of(4, 0));
        e.setUtcOffset(0);
        e.setExerciseType(ExerciseType.NUMBERREPEAT);
        e.setExerciseValue("10");
        e.setVisibility(Visibility.PUBLIC);
        Exercise saved = exerciseRepository.save(e);
        schedulerService.restartSchedulerFor(saved);
        exercises.add(saved.getExerciseId());
        return saved;
    }

    private void onHomeList(String username, Exercise exercise) {
        selectionRepository.save(new UserSelection(new UserSelectionId(username, exercise.getExerciseId()), 0));
    }

    private void period(Exercise exercise, String... finishers) {
        LocalDateTime end = LocalDateTime.now().minusDays(10 + 3L * ++periods); // well apart from the current period
        Period period = new Period();
        period.setExercise(exercise);
        period.setTimeRange(Range.openClosed(end.minusDays(1), end));
        Period saved = periodRepository.save(period);
        for (String username : finishers) {
            FinishedUser finishedUser = new FinishedUser();
            finishedUser.setPeriod(saved);
            finishedUser.setUsername(userRepository.findByUsername(username).orElseThrow());
            finishedUserRepository.save(finishedUser);
        }
    }
}
