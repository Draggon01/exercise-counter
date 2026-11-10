package org.exercise.counter.exercisecounter.migration;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * V20261110_002 must only drop the legacy table when its data was migrated (or it is empty).
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class DropLegacyStatisticTableTest {

    private static final String MIGRATION = "db/migration/V20261110_002__drop_legacy_statistic_table.sql";
    private static final String DATA_MIGRATION = "V20260306_001__migrateStatistics";

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void recreateLegacyTable() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS statistic_exercise_data (exercise_id uuid PRIMARY KEY, statistic json)");
        jdbc.update("DELETE FROM data_migration_history WHERE version = ?", DATA_MIGRATION);
    }

    @AfterEach
    void cleanup() {
        jdbc.execute("DROP TABLE IF EXISTS statistic_exercise_data");
        jdbc.update("DELETE FROM data_migration_history WHERE version = ?", DATA_MIGRATION);
    }

    @Test
    void keepsTable_whenItHasDataThatWasNotMigrated() throws Exception {
        jdbc.update("INSERT INTO statistic_exercise_data VALUES (?, '{}'::json)", UUID.randomUUID());

        runMigration();

        assertTrue(tableExists());
    }

    @Test
    void dropsTable_whenDataMigrationIsRecorded() throws Exception {
        jdbc.update("INSERT INTO statistic_exercise_data VALUES (?, '{}'::json)", UUID.randomUUID());
        jdbc.update("INSERT INTO data_migration_history (version) VALUES (?)", DATA_MIGRATION);

        runMigration();

        assertFalse(tableExists());
    }

    @Test
    void dropsTable_whenEmpty() throws Exception {
        runMigration();

        assertFalse(tableExists());
    }

    private void runMigration() throws Exception {
        jdbc.execute(new ClassPathResource(MIGRATION).getContentAsString(StandardCharsets.UTF_8));
    }

    private boolean tableExists() {
        Integer count = jdbc.queryForObject(
                "SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema() "
                        + "AND table_name = 'statistic_exercise_data'", Integer.class);
        return count != null && count > 0;
    }
}
