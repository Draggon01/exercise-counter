package org.exercise.counter.exercisecounter.web.scheduler;

import org.exercise.counter.exercisecounter.web.service.ReminderService;
import org.exercise.counter.exercisecounter.web.service.push.PushProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Looks for due reminders every {@code app.push.check-interval} (only if push is configured). */
@Component
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    private final ThreadPoolTaskScheduler taskScheduler;
    private final ReminderService reminderService;
    private final PushProperties properties;

    public ReminderScheduler(ThreadPoolTaskScheduler taskScheduler, ReminderService reminderService, PushProperties properties) {
        this.taskScheduler = taskScheduler;
        this.reminderService = reminderService;
        this.properties = properties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        if (!properties.enabled()) {
            return;
        }
        // first run after one interval: the exercise schedulers (time left) are running by then
        taskScheduler.scheduleWithFixedDelay(this::run, Instant.now().plus(properties.checkInterval()), properties.checkInterval());
    }

    private void run() {
        try {
            reminderService.remindDue();
        } catch (RuntimeException e) {
            // never let an exception escape: it would stop all future runs
            log.error("Reminder run failed", e);
        }
    }
}
