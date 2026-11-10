-- Version of the newest changelog entry the user has seen (NULL: never seen one).
ALTER TABLE options ADD COLUMN last_seen_changelog VARCHAR(32);
