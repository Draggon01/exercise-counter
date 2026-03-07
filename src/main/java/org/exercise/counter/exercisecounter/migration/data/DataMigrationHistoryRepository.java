package org.exercise.counter.exercisecounter.migration.data;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DataMigrationHistoryRepository
        extends JpaRepository<DataMigrationHistory, String> {
}
