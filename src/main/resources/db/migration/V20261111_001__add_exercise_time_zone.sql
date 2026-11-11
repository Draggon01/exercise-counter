-- Time zone of an exercise's reset time (IANA id, e.g. Europe/Vienna) – follows daylight saving time,
-- unlike the fixed utc_offset (kept as fallback). All existing exercises were created in Austria.
ALTER TABLE exercise ADD COLUMN time_zone VARCHAR(64);
UPDATE exercise SET time_zone = 'Europe/Vienna';
