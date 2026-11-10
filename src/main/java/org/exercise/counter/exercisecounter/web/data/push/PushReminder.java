package org.exercise.counter.exercisecounter.web.data.push;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;

/** A reminder was sent for this exercise and user in the current period (cleared on reset). */
@Entity
@Table(name = "push_reminder")
public class PushReminder {

    @EmbeddedId
    private PushReminderId id;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    public PushReminder() {
    }

    public PushReminder(PushReminderId id, LocalDateTime sentAt) {
        this.id = id;
        this.sentAt = sentAt;
    }

    public PushReminderId getId() {
        return id;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof PushReminder other && Objects.equals(id, other.id));
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public String toString() {
        return "PushReminder(id=" + id + ", sentAt=" + sentAt + ")";
    }
}
