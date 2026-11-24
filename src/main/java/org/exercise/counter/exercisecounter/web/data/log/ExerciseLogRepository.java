package org.exercise.counter.exercisecounter.web.data.log;

import java.util.Collection;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExerciseLogRepository extends JpaRepository<ExerciseLog, ExerciseLogId> {
    List<ExerciseLog> findByLogIdUsername(String username);

    List<ExerciseLog> findByLogIdExerciseId(UUID exerciseId);

    /** Only the ids (no managed entities): who has progress on these exercises. */
    @Query("select l.logId from ExerciseLog l where l.logId.exerciseId in :exerciseIds")
    List<ExerciseLogId> findIdsByExerciseIdIn(@Param("exerciseIds") Collection<UUID> exerciseIds);

    /** Account deletion: the progress of the user. */
    @Modifying
    @Query("delete from ExerciseLog l where l.logId.username = :username")
    void deleteByUsername(@Param("username") String username);

    /** exercise_log has no foreign key to exercise: deleted exercises take their logs along explicitly. */
    @Modifying
    @Query("delete from ExerciseLog l where l.logId.exerciseId = :exerciseId")
    void deleteByExerciseId(@Param("exerciseId") UUID exerciseId);
}
