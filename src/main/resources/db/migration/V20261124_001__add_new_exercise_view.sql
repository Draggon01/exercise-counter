-- "Try the new exercise view" (Options → General): off until the user turns it on.
ALTER TABLE options ADD COLUMN new_exercise_view BOOLEAN NOT NULL DEFAULT FALSE;
