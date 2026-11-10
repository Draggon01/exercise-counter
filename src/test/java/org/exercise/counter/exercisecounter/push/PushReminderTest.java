package org.exercise.counter.exercisecounter.push;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.options.UserOptions;
import org.exercise.counter.exercisecounter.web.data.options.UserOptionsRepository;
import org.exercise.counter.exercisecounter.web.data.push.PushReminderRepository;
import org.exercise.counter.exercisecounter.web.data.push.PushSubscription;
import org.exercise.counter.exercisecounter.web.data.push.PushSubscriptionRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.push.dto.PushSubscriptionRequest;
import org.exercise.counter.exercisecounter.web.scheduler.ExerciseResetJob;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.exercise.counter.exercisecounter.web.service.PushService;
import org.exercise.counter.exercisecounter.web.service.ReminderService;
import org.exercise.counter.exercisecounter.web.service.push.PushMessage;
import org.exercise.counter.exercisecounter.web.service.push.PushSender;
import org.exercise.counter.exercisecounter.web.service.push.WebPushCrypto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.web.server.ResponseStatusException;

import java.security.interfaces.ECPublicKey;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "app.push.public-key=test-public-key",
        "app.push.private-key=test-private-key",
        "app.push.check-interval=24h", // the background run never fires during the tests
})
@Import({TestcontainersConfiguration.class, PushReminderTest.FakeSenderConfig.class})
class PushReminderTest {

    private static final String ANNA = "push-anna";
    private static final String BEN = "push-ben";
    private static final String DEVICE_A = "https://fcm.googleapis.com/fcm/send/anna-phone";
    private static final String DEVICE_B = "https://updates.push.services.mozilla.com/wpush/v2/ben-laptop";

    @Autowired private ReminderService reminderService;
    @Autowired private PushService pushService;
    @Autowired private RecordingSender sender;
    @Autowired private SchedulerService schedulerService;
    @Autowired private ExerciseResetJob exerciseResetJob;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private UserSelectionRepository selectionRepository;
    @Autowired private CheckRepository checkRepository;
    @Autowired private UserOptionsRepository optionsRepository;
    @Autowired private PushSubscriptionRepository subscriptionRepository;
    @Autowired private PushReminderRepository reminderRepository;

    private final List<Exercise> exercises = new ArrayList<>();

    @BeforeEach
    void setup() {
        for (String name : List.of(ANNA, BEN)) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}x"));
            }
            subscriptionRepository.deleteAll(subscriptionRepository.findByUsername(name));
            optionsRepository.deleteById(name);
        }
        sender.reset();
    }

    @AfterEach
    void cleanup() {
        exercises.forEach(e -> schedulerService.cancelSchedulerFor(e.getExerciseId()));
        exerciseRepository.deleteAll(exercises); // cascades selections, checks, reminders
        exercises.clear();
        for (String name : List.of(ANNA, BEN)) {
            subscriptionRepository.deleteAll(subscriptionRepository.findByUsername(name));
        }
    }

    // ---- reminders

    @Test
    void unfinishedExerciseShortlyBeforeTheReset_isReminded() {
        Exercise pushUps = exerciseResettingIn(30, "Push-ups");
        onHomeList(ANNA, pushUps);
        device(ANNA, DEVICE_A);

        reminderService.remindDue();

        List<PushMessage> got = sender.messagesTo(DEVICE_A);
        assertEquals(1, got.size());
        assertEquals("Push-ups is not done yet", got.getFirst().title());
        assertTrue(got.getFirst().body().startsWith("30 minutes left"), got.getFirst().body());
    }

    @Test
    void remindsOnlyOncePerPeriod_andAgainAfterTheReset() {
        Exercise pushUps = exerciseResettingIn(30, "Push-ups");
        onHomeList(ANNA, pushUps);
        device(ANNA, DEVICE_A);

        reminderService.remindDue();
        reminderService.remindDue();
        assertEquals(1, sender.messagesTo(DEVICE_A).size(), "second run must not remind again");

        exerciseResetJob.run(pushUps.getExerciseId()); // new period
        reminderService.remindDue();
        assertEquals(2, sender.messagesTo(DEVICE_A).size(), "new period: reminded again");
    }

    @Test
    void finishedExercise_isNotReminded() {
        Exercise pushUps = exerciseResettingIn(30, "Push-ups");
        onHomeList(ANNA, pushUps);
        checkRepository.save(new Check(new CheckId(pushUps.getExerciseId(), ANNA)));
        device(ANNA, DEVICE_A);

        reminderService.remindDue();

        assertTrue(sender.messagesTo(DEVICE_A).isEmpty());
    }

    @Test
    void resetFurtherAwayThanTheChosenHours_isNotRemindedYet() {
        Exercise plank = exerciseResettingIn(5 * 60, "Plank");
        onHomeList(ANNA, plank);
        device(ANNA, DEVICE_A);

        reminderService.remindDue(); // default: 3 hours
        assertTrue(sender.messagesTo(DEVICE_A).isEmpty());

        UserOptions options = new UserOptions(ANNA, true);
        options.setReminderHours(6);
        optionsRepository.save(options);
        reminderService.remindDue();
        assertEquals(1, sender.messagesTo(DEVICE_A).size(), "within 6 hours");
    }

    @Test
    void severalDueExercises_comeInOneNotification_inHomeListOrder() {
        Exercise plank = exerciseResettingIn(90, "Plank");
        Exercise pushUps = exerciseResettingIn(40, "Push-ups");
        onHomeList(ANNA, pushUps, plank);
        device(ANNA, DEVICE_A);

        reminderService.remindDue();

        List<PushMessage> got = sender.messagesTo(DEVICE_A);
        assertEquals(1, got.size());
        assertEquals("2 exercises are not done yet", got.getFirst().title());
        assertEquals("Push-ups, Plank · 40 minutes left", got.getFirst().body());
    }

    @Test
    void usersWithoutADevice_andExercisesNotOnTheHomeList_areIgnored() {
        Exercise pushUps = exerciseResettingIn(30, "Push-ups");
        onHomeList(ANNA, pushUps);   // Anna has no device
        device(BEN, DEVICE_B);       // Ben has a device but not this exercise

        reminderService.remindDue();

        assertTrue(sender.messagesTo(DEVICE_B).isEmpty());
        assertTrue(reminderRepository.findByIdUsernameIn(List.of(ANNA, BEN)).isEmpty());
    }

    @Test
    void failedDelivery_isTriedAgainNextRun() {
        Exercise pushUps = exerciseResettingIn(30, "Push-ups");
        onHomeList(ANNA, pushUps);
        device(ANNA, DEVICE_A);
        sender.answer(DEVICE_A, PushSender.Result.FAILED);

        reminderService.remindDue();
        assertTrue(reminderRepository.findByIdUsernameIn(List.of(ANNA)).isEmpty(), "not marked as reminded");

        sender.answer(DEVICE_A, PushSender.Result.SENT);
        reminderService.remindDue();
        assertEquals(2, sender.messagesTo(DEVICE_A).size());
        assertEquals(1, reminderRepository.findByIdUsernameIn(List.of(ANNA)).size());
    }

    @Test
    void goneDevice_isRemoved() {
        Exercise pushUps = exerciseResettingIn(30, "Push-ups");
        onHomeList(ANNA, pushUps);
        device(ANNA, DEVICE_A);
        sender.answer(DEVICE_A, PushSender.Result.GONE);

        reminderService.remindDue();

        assertFalse(subscriptionRepository.existsById(DEVICE_A));
    }

    // ---- subscriptions

    @Test
    void subscribe_storesTheDevice_andMovesItWhenAnotherUserLogsIn() {
        pushService.subscribe(ANNA, request(DEVICE_A));
        assertEquals(ANNA, subscriptionRepository.findById(DEVICE_A).orElseThrow().getUsername());

        pushService.subscribe(BEN, request(DEVICE_A));
        assertEquals(BEN, subscriptionRepository.findById(DEVICE_A).orElseThrow().getUsername());
    }

    @Test
    void subscribe_rejectsOtherHostsAndBrokenKeys() {
        assertBadRequest(() -> pushService.subscribe(ANNA, request("https://169.254.169.254/latest")));
        assertBadRequest(() -> pushService.subscribe(ANNA,
                new PushSubscriptionRequest(DEVICE_A, new PushSubscriptionRequest.Keys("short", "short"))));
        assertBadRequest(() -> pushService.subscribe(ANNA, new PushSubscriptionRequest(DEVICE_A, null)));
        assertFalse(subscriptionRepository.existsById(DEVICE_A));
    }

    @Test
    void unsubscribe_onlyRemovesOwnDevices() {
        device(ANNA, DEVICE_A);

        pushService.unsubscribe(BEN, DEVICE_A);
        assertTrue(subscriptionRepository.existsById(DEVICE_A));

        pushService.unsubscribe(ANNA, DEVICE_A);
        assertFalse(subscriptionRepository.existsById(DEVICE_A));
    }

    @Test
    void sendTest_reachesAllDevicesOfTheUser() {
        device(ANNA, DEVICE_A);
        device(ANNA, DEVICE_B);

        assertEquals(2, pushService.sendTest(ANNA).delivered());
        assertEquals("Reminders are on", sender.messagesTo(DEVICE_B).getFirst().title());
    }

    @Test
    void sendTest_withoutDevice_is404() {
        var error = assertThrows(ResponseStatusException.class, () -> pushService.sendTest(ANNA));
        assertEquals(404, error.getStatusCode().value());
    }

    @Test
    void config_publishesThePublicKey() {
        var config = pushService.config();
        assertTrue(config.enabled());
        assertEquals("test-public-key", config.publicKey());
    }

    // ---- helpers

    /** An exercise whose next reset is the given number of minutes from now. */
    private Exercise exerciseResettingIn(int minutes, String title) {
        Exercise e = new Exercise();
        e.setExerciseTitle(title);
        e.setCreator(ANNA);
        e.setDaysRepeat(1);
        e.setStartTime(LocalTime.now(ZoneOffset.UTC).plusMinutes(minutes).withNano(0));
        e.setUtcOffset(0);
        e.setExerciseType(ExerciseType.NUMBERREPEAT);
        e.setExerciseValue("10");
        e.setVisibility(Visibility.PRIVATE);
        Exercise saved = exerciseRepository.save(e);
        schedulerService.restartSchedulerFor(saved);
        exercises.add(saved);
        return saved;
    }

    private void onHomeList(String username, Exercise... list) {
        for (int i = 0; i < list.length; i++) {
            selectionRepository.save(new UserSelection(new UserSelectionId(username, list[i].getExerciseId()), i));
        }
    }

    private void device(String username, String endpoint) {
        subscriptionRepository.save(new PushSubscription(endpoint, username, "key", "auth", LocalDateTime.now()));
    }

    private static PushSubscriptionRequest request(String endpoint) {
        String p256dh = WebPushCrypto.encode(WebPushCrypto.encodePoint((ECPublicKey) WebPushCrypto.generateKeyPair().getPublic()));
        return new PushSubscriptionRequest(endpoint, new PushSubscriptionRequest.Keys(p256dh, WebPushCrypto.encode(new byte[16])));
    }

    private static void assertBadRequest(Runnable action) {
        var error = assertThrows(ResponseStatusException.class, action::run);
        assertEquals(400, error.getStatusCode().value());
    }

    /** Records instead of sending; the answer per device can be set. */
    static class RecordingSender implements PushSender {
        private final List<Map.Entry<String, PushMessage>> sent = new CopyOnWriteArrayList<>();
        private final Map<String, Result> answers = new HashMap<>();

        @Override
        public Result send(PushSubscription subscription, PushMessage message) {
            sent.add(Map.entry(subscription.getEndpoint(), message));
            return answers.getOrDefault(subscription.getEndpoint(), Result.SENT);
        }

        List<PushMessage> messagesTo(String endpoint) {
            return sent.stream().filter(e -> e.getKey().equals(endpoint)).map(Map.Entry::getValue).toList();
        }

        void answer(String endpoint, Result result) {
            answers.put(endpoint, result);
        }

        void reset() {
            sent.clear();
            answers.clear();
        }
    }

    @TestConfiguration
    static class FakeSenderConfig {
        @Bean
        @Primary
        RecordingSender recordingSender() {
            return new RecordingSender();
        }
    }
}
