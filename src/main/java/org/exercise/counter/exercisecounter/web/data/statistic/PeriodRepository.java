package org.exercise.counter.exercisecounter.web.data.statistic;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PeriodRepository extends JpaRepository<Period, UUID> {

    List<Period> findByExerciseExerciseId(UUID exerciseId);

    @Query(value = "SELECT * FROM periods WHERE exercise_id = :exerciseId " +
            "AND time_range @> CAST(:timestamp AS timestamp)",
            nativeQuery = true)
    Optional<Period> findActiveByExerciseIdAndTimestamp(
            @Param("exerciseId") UUID exerciseId,
            @Param("timestamp") LocalDateTime timestamp
    );
}
