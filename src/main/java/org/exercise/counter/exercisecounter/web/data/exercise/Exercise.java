package org.exercise.counter.exercisecounter.web.data.exercise;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Time;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.OffsetTime;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Exercise {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column
    private UUID exerciseId;

    @Column
    private String exerciseTitle;

    @Column
    private String creator;

    @Column
    private Integer daysRepeat;

    @Column
    private LocalTime startTime;

    @Column
    private Integer utcOffset;

    @Enumerated(EnumType.STRING)
    @Column
    private ExerciseType exerciseType;

}
