-- Guided workout: countdown before a timed step that has no rest before it; 0 = off.
ALTER TABLE exercise_detail ADD COLUMN get_ready_seconds INT NOT NULL DEFAULT 5;
