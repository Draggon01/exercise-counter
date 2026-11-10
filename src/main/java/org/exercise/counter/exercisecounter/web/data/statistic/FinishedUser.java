package org.exercise.counter.exercisecounter.web.data.statistic;

import jakarta.persistence.*;
import org.exercise.counter.exercisecounter.web.data.user.User;

import java.util.UUID;

@Entity
public class FinishedUser {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private Period period;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "username", nullable = false)
    private User username;

    public FinishedUser() {
    }

    public UUID getId() {
        return this.id;
    }

    public Period getPeriod() {
        return this.period;
    }

    public User getUsername() {
        return this.username;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setPeriod(Period period) {
        this.period = period;
    }

    public void setUsername(User username) {
        this.username = username;
    }
}
