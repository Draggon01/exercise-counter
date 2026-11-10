package org.exercise.counter.exercisecounter.push;

import org.exercise.counter.exercisecounter.web.service.push.PushMessage;
import org.exercise.counter.exercisecounter.web.service.push.ReminderMessages;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReminderMessagesTest {

    @Test
    void timeLeft_roundsUpLikeTheCards() {
        assertEquals("1 minute left", ReminderMessages.timeLeft(10));
        assertEquals("25 minutes left", ReminderMessages.timeLeft(24 * 60 + 1));
        assertEquals("1 hour left", ReminderMessages.timeLeft(3600));
        assertEquals("3 hours left", ReminderMessages.timeLeft(2 * 3600 + 1));
    }

    @Test
    void oneExercise_namesItInTheTitle() {
        PushMessage message = ReminderMessages.reminder(List.of("Push-ups"), 3 * 3600);

        assertEquals("Push-ups is not done yet", message.title());
        assertEquals("3 hours left – keep your streak going 🔥", message.body());
        assertEquals("/", message.url());
    }

    @Test
    void severalExercises_areListedInTheBody() {
        PushMessage message = ReminderMessages.reminder(List.of("Push-ups", "Plank"), 1800);

        assertEquals("2 exercises are not done yet", message.title());
        assertEquals("Push-ups, Plank · 30 minutes left", message.body());
    }
}
