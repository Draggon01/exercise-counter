CREATE TABLE exercise_log (
    exercise_id UUID      NOT NULL,
    username    TEXT      NOT NULL,
    value       BIGINT    NOT NULL,
    updated_at  TIMESTAMP NOT NULL,
    PRIMARY KEY (exercise_id, username)
);