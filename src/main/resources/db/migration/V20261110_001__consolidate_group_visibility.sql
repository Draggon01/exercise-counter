-- V20260328_001 added "group_visibility", but the Group entity mapped a column named "visibility".
-- With ddl-auto=update Hibernate created that extra (nullable) "visibility" column, and the app
-- has been reading/writing it ever since. The entity now maps "group_visibility" and Hibernate
-- only validates, so move the real values over and remove the duplicate column.
-- On a fresh database the "visibility" column never exists and this is a no-op.
DO
$$
BEGIN
    IF EXISTS (SELECT 1
               FROM information_schema.columns
               WHERE table_schema = current_schema()
                 AND table_name = 'groups'
                 AND column_name = 'visibility') THEN
        UPDATE groups SET group_visibility = visibility WHERE visibility IS NOT NULL;
        ALTER TABLE groups DROP COLUMN visibility;
    END IF;
END
$$;
