package org.exercise.counter.exercisecounter.web.data.statistic;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import org.hibernate.annotations.Type;

import java.util.UUID;
import java.util.Objects;

@Entity(name = "statistic_exercise_data")
public class StatisticJpa {
    @Id
    private UUID exerciseId;

    @Type(JsonType.class)
    @Column(columnDefinition = "json")
    private Statistic statistic;

    public StatisticJpa() {
    }

    public StatisticJpa(UUID exerciseId, Statistic statistic) {
        this.exerciseId = exerciseId;
        this.statistic = statistic;
    }

    public UUID getExerciseId() {
        return this.exerciseId;
    }

    public Statistic getStatistic() {
        return this.statistic;
    }

    public void setExerciseId(UUID exerciseId) {
        this.exerciseId = exerciseId;
    }

    public void setStatistic(Statistic statistic) {
        this.statistic = statistic;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StatisticJpa other)) return false;
        return Objects.equals(getExerciseId(), other.getExerciseId()) &&
                Objects.equals(getStatistic(), other.getStatistic());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getExerciseId(), getStatistic());
    }

    @Override
    public String toString() {
        return "StatisticJpa(exerciseId=" + this.getExerciseId() + ", statistic=" + this.getStatistic() + ")";
    }
}
