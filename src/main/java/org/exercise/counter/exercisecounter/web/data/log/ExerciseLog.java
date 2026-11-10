package org.exercise.counter.exercisecounter.web.data.log;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
public class ExerciseLog {

    @EmbeddedId
    private ExerciseLogId logId;

    @Column(nullable = false)
    private Long value;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public ExerciseLog() {
    }

    public ExerciseLog(ExerciseLogId logId, Long value, LocalDateTime updatedAt) {
        this.logId = logId;
        this.value = value;
        this.updatedAt = updatedAt;
    }

    public ExerciseLogId getLogId() {
        return this.logId;
    }

    public Long getValue() {
        return this.value;
    }

    public LocalDateTime getUpdatedAt() {
        return this.updatedAt;
    }

    public void setLogId(ExerciseLogId logId) {
        this.logId = logId;
    }

    public void setValue(Long value) {
        this.value = value;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExerciseLog other)) return false;
        return Objects.equals(getValue(), other.getValue()) &&
                Objects.equals(getLogId(), other.getLogId()) &&
                Objects.equals(getUpdatedAt(), other.getUpdatedAt());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getValue(), getLogId(), getUpdatedAt());
    }

    @Override
    public String toString() {
        return "ExerciseLog(logId=" + this.getLogId() + ", value=" + this.getValue() + ", updatedAt=" + this.getUpdatedAt() + ")";
    }
}
