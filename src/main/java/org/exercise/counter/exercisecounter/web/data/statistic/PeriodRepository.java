package org.exercise.counter.exercisecounter.web.data.statistic;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PeriodRepository extends JpaRepository<Period, UUID> {

    List<Period> findByExerciseExerciseId(UUID exerciseId);

    List<Period> findByExerciseExerciseIdIn(Collection<UUID> exerciseIds);

    @Query(value = "SELECT max(upper(time_range)) FROM period WHERE exercise_id = :exerciseId", nativeQuery = true)
    Object findLatestEndRaw(@Param("exerciseId") UUID exerciseId);

    /**
     * @return the end of the latest stored period of the exercise, or {@code null} if there is none
     */
    default LocalDateTime findLatestEnd(UUID exerciseId) {
        return switch (findLatestEndRaw(exerciseId)) {
            case null -> null;
            case LocalDateTime ldt -> ldt;
            case java.sql.Timestamp ts -> ts.toLocalDateTime();
            case Object other -> throw new IllegalStateException("Unexpected type " + other.getClass());
        };
    }

    @Query(value = "SELECT * FROM periods WHERE exercise_id = :exerciseId " +
            "AND time_range @> CAST(:timestamp AS timestamp)",
            nativeQuery = true)
    Optional<Period> findActiveByExerciseIdAndTimestamp(
            @Param("exerciseId") UUID exerciseId,
            @Param("timestamp") LocalDateTime timestamp
    );
}
