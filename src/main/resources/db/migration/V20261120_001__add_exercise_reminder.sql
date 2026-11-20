-- Reminders are chosen per exercise on the user's home list (before: all exercises of the home list).
ALTER TABLE show_exercise_for_user ADD COLUMN remind BOOLEAN NOT NULL DEFAULT FALSE;

-- users who already get reminders keep them for the exercises they have now
UPDATE show_exercise_for_user SET remind = TRUE WHERE username IN (SELECT username FROM push_subscription);
