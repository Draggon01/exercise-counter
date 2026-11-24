-- Description and steps of an exercise. Own tables: saving an exercise (PUT /api/exercises/{id}) rebuilds its row and
-- restarts its scheduler, changing a hint must not.
CREATE TABLE exercise_detail (
    exercise_id UUID        PRIMARY KEY REFERENCES exercise (exercise_id) ON DELETE CASCADE,
    description TEXT        NOT NULL DEFAULT '',
    guided_mode VARCHAR(16) NOT NULL DEFAULT 'OFF'
);

CREATE TABLE exercise_step (
    step_id          UUID        PRIMARY KEY,
    exercise_id      UUID        NOT NULL REFERENCES exercise (exercise_id) ON DELETE CASCADE,
    position         INT         NOT NULL,
    title            VARCHAR(80) NOT NULL,
    hints            TEXT        NOT NULL DEFAULT '',
    sets             INT,
    reps             INT,
    duration_seconds INT,
    rest_seconds     INT,
    CONSTRAINT exercise_step_reps_or_duration CHECK (reps IS NULL OR duration_seconds IS NULL)
);

CREATE INDEX idx_exercise_step_exercise ON exercise_step (exercise_id, position);
