-- Devices that get reminders: one Web Push subscription per browser / installed app.
CREATE TABLE push_subscription
(
    endpoint   VARCHAR(2048) NOT NULL,
    username   VARCHAR(255)  NOT NULL,
    p256dh     VARCHAR(255)  NOT NULL,
    auth       VARCHAR(255)  NOT NULL,
    created_at TIMESTAMP     NOT NULL,
    CONSTRAINT pk_push_subscription PRIMARY KEY (endpoint),
    CONSTRAINT fk_push_subscription_user FOREIGN KEY (username) REFERENCES users (username) ON DELETE CASCADE
);
CREATE INDEX idx_push_subscription_username ON push_subscription (username);

-- Reminders already sent in the current period of an exercise (cleared when the exercise resets).
CREATE TABLE push_reminder
(
    exercise_id UUID         NOT NULL,
    username    VARCHAR(255) NOT NULL,
    sent_at     TIMESTAMP    NOT NULL,
    CONSTRAINT pk_push_reminder PRIMARY KEY (exercise_id, username),
    CONSTRAINT fk_push_reminder_exercise FOREIGN KEY (exercise_id) REFERENCES exercise (exercise_id) ON DELETE CASCADE,
    CONSTRAINT fk_push_reminder_user FOREIGN KEY (username) REFERENCES users (username) ON DELETE CASCADE
);

-- How many hours before the reset an unfinished exercise is reminded.
ALTER TABLE options ADD COLUMN reminder_hours INT NOT NULL DEFAULT 3;
