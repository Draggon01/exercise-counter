-- Video or photo of a step. The files lie in app.media.dir, named by media_id (a new upload gets a new id).
-- Deleting a row does not delete its files: MediaService does, and MediaCleanup as a safety net.
CREATE TABLE exercise_media (
    media_id    UUID         PRIMARY KEY,
    step_id     UUID         NOT NULL UNIQUE REFERENCES exercise_step (step_id) ON DELETE CASCADE,
    kind        VARCHAR(16)  NOT NULL,
    uploaded_by VARCHAR(64)  REFERENCES users (username) ON DELETE SET NULL,
    status      VARCHAR(16)  NOT NULL,
    error       VARCHAR(255),
    size_bytes  BIGINT       NOT NULL DEFAULT 0,
    duration_ms INT,
    width       INT,
    height      INT,
    has_audio   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL
);
