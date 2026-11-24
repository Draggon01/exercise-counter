package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.options.UserOptions;
import org.exercise.counter.exercisecounter.web.data.options.UserOptionsRepository;
import org.exercise.counter.exercisecounter.web.data.push.*;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.exercise.counter.exercisecounter.web.service.push.QuietHours;
import org.exercise.counter.exercisecounter.web.service.push.ReminderMessages;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Reminds users of the exercises on their home list they chose ({@link UserSelection#isRemind()}) and have
 * not finished yet, a configurable number of
 * hours ({@link UserOptions#getReminderHours()}) before the reset. One notification per user and run,
 * each exercise at most once per period ({@link PushReminder}, cleared by the reset). Nothing is sent in the
 * user's quiet hours ({@link QuietHours}).
 */
@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    private final PushSubscriptionRepository subscriptionRepository;
    private final PushReminderRepository reminderRepository;
    private final UserOptionsRepository optionsRepository;
    private final UserSelectionRepository selectionRepository;
    private final CheckRepository checkRepository;
    private final SchedulerService schedulerService;
    private final PushService pushService;
    private final Clock clock;

    public ReminderService(PushSubscriptionRepository subscriptionRepository, PushReminderRepository reminderRepository,
                           UserOptionsRepository optionsRepository, UserSelectionRepository selectionRepository,
                           CheckRepository checkRepository, SchedulerService schedulerService,
                           PushService pushService, Clock clock) {
        this.subscriptionRepository = subscriptionRepository;
        this.reminderRepository = reminderRepository;
        this.optionsRepository = optionsRepository;
        this.selectionRepository = selectionRepository;
        this.checkRepository = checkRepository;
        this.schedulerService = schedulerService;
        this.pushService = pushService;
        this.clock = clock;
    }

    /** @return how many users got a reminder */
    @Transactional
    public int remindDue() {
        Map<String, List<PushSubscription>> devicesByUser = subscriptionRepository.findAll().stream()
                .collect(Collectors.groupingBy(PushSubscription::getUsername));
        if (devicesByUser.isEmpty()) {
            return 0;
        }
        Set<String> users = devicesByUser.keySet();
        Map<String, UserOptions> optionsByUser = optionsRepository.findAllById(users).stream()
                .collect(Collectors.toMap(UserOptions::getUsername, options -> options));
        Set<String> done = checkRepository.findByCheckIdUsernameIn(users).stream()
                .map(check -> key(check.getCheckId().getUsername(), check.getCheckId().getExerciseId()))
                .collect(Collectors.toSet());
        Set<String> alreadyReminded = reminderRepository.findByIdUsernameIn(users).stream()
                .map(reminder -> key(reminder.getId().username(), reminder.getId().exerciseId()))
                .collect(Collectors.toSet());
        Map<String, List<UserSelection>> homeLists = selectionRepository.findRemindedWithExerciseByUsernameIn(users).stream()
                .collect(Collectors.groupingBy(selection -> selection.getUserSelectionId().getUsername()));

        LocalDateTime now = LocalDateTime.now(clock.withZone(ZoneOffset.UTC));
        int reminded = 0;
        for (Map.Entry<String, List<UserSelection>> entry : homeLists.entrySet()) {
            String username = entry.getKey();
            UserOptions options = optionsByUser.get(username);
            if (options != null && options.isQuietHours() && QuietHours.isQuiet(
                    options.getQuietFrom(), options.getQuietUntil(), options.getTimeZone(), clock.instant())) {
                continue; // sent by the first run after the quiet hours (if the exercise has not reset by then)
            }
            long window = (options != null ? options.getReminderHours() : UserOptions.DEFAULT_REMINDER_HOURS) * 3600L;
            List<UserSelection> due = entry.getValue().stream()
                    .filter(selection -> {
                        UUID exerciseId = selection.getUserSelectionId().getExerciseId();
                        String key = key(username, exerciseId);
                        long left = secondsLeft(exerciseId);
                        return !done.contains(key) && !alreadyReminded.contains(key) && left > 0 && left <= window;
                    })
                    .sorted(Comparator.comparing(UserSelection::getPosition, Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
            if (due.isEmpty()) {
                continue;
            }
            long soonest = due.stream().mapToLong(s -> secondsLeft(s.getUserSelectionId().getExerciseId())).min().orElse(0);
            List<String> titles = due.stream().map(s -> s.getExercise().getExerciseTitle()).toList();
            String singleUrl = options != null && options.isNewExerciseView()
                    ? "/exercises/" + due.getFirst().getUserSelectionId().getExerciseId()
                    : "/";
            int delivered = pushService.send(devicesByUser.get(username),
                    ReminderMessages.reminder(titles, soonest, singleUrl));
            if (delivered > 0) {
                // only when it arrived somewhere – otherwise the next run tries again
                reminderRepository.saveAll(due.stream()
                        .map(s -> new PushReminder(new PushReminderId(s.getUserSelectionId().getExerciseId(), username), now))
                        .toList());
                reminded++;
            }
        }
        if (reminded > 0) {
            log.info("Sent reminders to {} user(s)", reminded);
        }
        return reminded;
    }

    /** Ids of the exercises the user gets reminders for. */
    @Transactional(readOnly = true)
    public List<UUID> reminderExercises(String username) {
        return selectionRepository.findRemindedExerciseIdsByUsername(username);
    }

    /** Turns reminders for one exercise of the user's home list on or off. */
    @Transactional
    public void setReminder(String username, UUID exerciseId, boolean on) {
        UserSelection selection = selectionRepository.findById(new UserSelectionId(username, exerciseId))
                .orElseThrow(() -> new NotFoundException("This exercise is not on your list"));
        selection.setRemind(on);
        selectionRepository.save(selection);
    }

    private long secondsLeft(UUID exerciseId) {
        return schedulerService.isScheduled(exerciseId) ? schedulerService.getTimeLeftSeconds(exerciseId) : 0;
    }

    private static String key(String username, UUID exerciseId) {
        return username + "|" + exerciseId;
    }
}
