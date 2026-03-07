package org.exercise.counter.exercisecounter.migration.data;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Getter;

@Getter
@Entity
public class DataMigrationHistory {

    @Id
    private String version;

    protected DataMigrationHistory() {
    }

    public DataMigrationHistory(String version) {
        this.version = version;
    }

}