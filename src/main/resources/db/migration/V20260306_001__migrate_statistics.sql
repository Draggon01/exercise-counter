CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE period
(
    period_id   uuid PRIMARY KEY,
    exercise_id uuid    NOT NULL REFERENCES exercise (exercise_id) ON DELETE CASCADE,
    time_range  TSRANGE NOT NULL,

    EXCLUDE USING GIST (
        exercise_id WITH =,
        time_range WITH &&
        )
);

CREATE TABLE finished_user
(
    id        uuid PRIMARY KEY,
    period_id uuid         NOT NULL REFERENCES period (period_id) ON DELETE CASCADE,
    username  varchar(255) NOT NULL REFERENCES users (username) ON DELETE CASCADE,
    UNIQUE (period_id, username)
);

CREATE INDEX idx_periods_exercise ON period (exercise_id);
CREATE INDEX idx_periods_dates ON period (time_range);
CREATE INDEX idx_finished_period ON finished_user (period_id);
CREATE INDEX idx_finished_user ON finished_user (username);


CREATE TABLE data_migration_history
(
    version varchar(255) not null primary key
)