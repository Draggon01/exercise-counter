-- The JSON statistics in statistic_exercise_data were moved to period / finished_user by the
-- data migration V20260306_001__migrateStatistics, and the code for the old model is removed.
-- Drop the table only when that data migration is recorded (or there is nothing to lose),
-- otherwise keep it untouched so no data can get lost.
DO
$$
BEGIN
    IF EXISTS (SELECT 1 FROM data_migration_history WHERE version = 'V20260306_001__migrateStatistics')
       OR NOT EXISTS (SELECT 1 FROM statistic_exercise_data) THEN
        DROP TABLE statistic_exercise_data;
    END IF;
END
$$;
