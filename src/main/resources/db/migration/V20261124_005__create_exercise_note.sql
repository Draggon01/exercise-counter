-- Personal notes on an exercise, only visible to the user who wrote them.
CREATE TABLE exercise_note (
    exercise_id UUID        NOT NULL REFERENCES exercise (exercise_id) ON DELETE CASCADE,
    username    VARCHAR(64) NOT NULL REFERENCES users (username) ON DELETE CASCADE,
    text        TEXT        NOT NULL,
    PRIMARY KEY (exercise_id, username)
);
