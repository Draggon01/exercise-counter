package org.exercise.counter.exercisecounter.web.data.statistic;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.exercise.counter.exercisecounter.web.data.user.User;

import java.util.UUID;

@Entity
@RequiredArgsConstructor
@Getter
@Setter
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
}