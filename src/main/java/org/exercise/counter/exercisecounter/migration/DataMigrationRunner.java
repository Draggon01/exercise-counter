package org.exercise.counter.exercisecounter.migration;

import jakarta.transaction.Transactional;
import org.exercise.counter.exercisecounter.migration.data.DataMigrationHistory;
import org.exercise.counter.exercisecounter.migration.data.DataMigrationHistoryRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
public class DataMigrationRunner {

    private final List<DataMigration> migrations;
    private final DataMigrationHistoryRepository historyRepository;

    public DataMigrationRunner(
            List<DataMigration> migrations,
            DataMigrationHistoryRepository historyRepository) {
        this.migrations = migrations;
        this.historyRepository = historyRepository;
    }

    @Transactional
    @EventListener(ApplicationReadyEvent.class)
    public void runMigrations() {

        migrations.stream()
                .sorted(Comparator.comparing(m -> m.getClass().getSimpleName()))
                .forEach(migration -> {

                    String version = migration.getClass().getSimpleName();

                    if (historyRepository.existsById(version)) {
                        return;
                    }

                    migration.migrate();

                    historyRepository.save(new DataMigrationHistory(version));
                });
    }
}