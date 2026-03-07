package org.exercise.counter.exercisecounter.web.data.statistic;

import io.hypersistence.utils.hibernate.type.range.PostgreSQLRangeType;
import io.hypersistence.utils.hibernate.type.range.Range;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.hibernate.annotations.Type;


import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@RequiredArgsConstructor
@Getter
@Setter
public class Period {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID periodId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Type(PostgreSQLRangeType.class)
    @Column(name = "time_range", columnDefinition = "tsrange", nullable = false)
    private Range<LocalDateTime> timeRange;
}
