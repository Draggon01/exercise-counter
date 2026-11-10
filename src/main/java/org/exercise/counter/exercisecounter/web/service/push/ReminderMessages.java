package org.exercise.counter.exercisecounter.web.service.push;

import java.util.List;

/** Texts of the notifications (written for users, like the rest of the UI). */
public final class ReminderMessages {

    /** Same tag: a newer reminder replaces an older one that is still shown. */
    public static final String REMINDER_TAG = "reminder";

    private ReminderMessages() {
    }

    /** One notification for all exercises of a user that are due now. */
    public static PushMessage reminder(List<String> exerciseTitles, long secondsLeft) {
        String left = timeLeft(secondsLeft);
        if (exerciseTitles.size() == 1) {
            return new PushMessage(exerciseTitles.getFirst() + " is not done yet",
                    left + " – keep your streak going 🔥", "/", REMINDER_TAG);
        }
        return new PushMessage(exerciseTitles.size() + " exercises are not done yet",
                String.join(", ", exerciseTitles) + " · " + left, "/", REMINDER_TAG);
    }

    public static PushMessage test() {
        return new PushMessage("Reminders are on", "This is how a reminder will look.", "/options", "test");
    }

    /** "3 hours left" / "1 hour left" / "25 minutes left" – rounded up like on the exercise cards. */
    public static String timeLeft(long seconds) {
        if (seconds < 3600) {
            long minutes = Math.max(1, (seconds + 59) / 60);
            return minutes + (minutes == 1 ? " minute left" : " minutes left");
        }
        long hours = (seconds + 3599) / 3600;
        return hours + (hours == 1 ? " hour left" : " hours left");
    }
}
