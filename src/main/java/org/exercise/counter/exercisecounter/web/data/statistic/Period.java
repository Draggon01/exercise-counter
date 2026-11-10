package org.exercise.counter.exercisecounter.web.data.statistic;

import io.hypersistence.utils.hibernate.type.range.PostgreSQLRangeType;
import io.hypersistence.utils.hibernate.type.range.Range;
import jakarta.persistence.*;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Entity
public class Period {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID periodId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Type(PostgreSQLRangeType.class)
    @Column(name = "time_range", columnDefinition = "tsrange", nullable = false)
    private Range<LocalDateTime> timeRange;

    /**
     * Key used by the statistics view. It shows the day the period was closed (the reset day),
     * which is what the legacy single-point periods always displayed.
     */
    public String toKeyString() {
        String end = FORMAT.format(timeRange.upper());
        return end + ":" + end;
    }

    public Period() {
    }

    public UUID getPeriodId() {
        return this.periodId;
    }

    public Exercise getExercise() {
        return this.exercise;
    }

    public Range<LocalDateTime> getTimeRange() {
        return this.timeRange;
    }

    public void setPeriodId(UUID periodId) {
        this.periodId = periodId;
    }

    public void setExercise(Exercise exercise) {
        this.exercise = exercise;
    }

    public void setTimeRange(Range<LocalDateTime> timeRange) {
        this.timeRange = timeRange;
    }
}
