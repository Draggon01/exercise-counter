package org.exercise.counter.exercisecounter.web.data.streak;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "complete_streak")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompleteStreak {
    @Id
    @Column(name = "username")
    private String username;

    @Column
    private Integer streak;
}
