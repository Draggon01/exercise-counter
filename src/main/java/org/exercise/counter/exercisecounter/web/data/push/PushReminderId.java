package org.exercise.counter.exercisecounter.web.data.push;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
public record PushReminderId(
        @Column(name = "exercise_id") UUID exerciseId,
        @Column(name = "username") String username) implements Serializable {
}
