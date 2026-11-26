-- Set when an edit would make the current period end right away (e.g. fewer days between resets):
-- the next reset waits until this moment instead. Survives a restart; cleared by the next reset.
ALTER TABLE exercise ADD COLUMN reset_not_before TIMESTAMP WITH TIME ZONE;
