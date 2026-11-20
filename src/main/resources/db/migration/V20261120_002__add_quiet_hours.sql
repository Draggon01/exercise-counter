-- Quiet hours: no push reminders between quiet_from and quiet_until (full hours, local time in time_zone).
ALTER TABLE options ADD COLUMN quiet_hours BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE options ADD COLUMN quiet_from INT NOT NULL DEFAULT 22;
ALTER TABLE options ADD COLUMN quiet_until INT NOT NULL DEFAULT 7;
-- IANA id of the user's browser zone, sent with the quiet hours
ALTER TABLE options ADD COLUMN time_zone VARCHAR(64);
