package org.exercise.counter.exercisecounter.web.data.checks;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CheckRepository extends JpaRepository<Check, CheckId> {

    List<Check> findByCheckIdExerciseIdIn(Collection<UUID> exerciseIds);
    List<Check> findCheckByCheckIdExerciseId(UUID exerciseId);

    List<Check> findCheckByCheckIdUsername(String username);

    List<Check> findByCheckIdUsernameIn(Collection<String> usernames);

    /** Marks done; already done is fine (two fast requests must not fail on the primary key). */
    @Modifying
    @Query(value = "insert into checks (exercise_id, username) values (:exerciseId, :username) on conflict do nothing",
            nativeQuery = true)
    void insertIfAbsent(@Param("exerciseId") UUID exerciseId, @Param("username") String username);

    /** Undoes "done"; not done (any more) is fine. */
    @Modifying
    @Query("delete from checks c where c.checkId.exerciseId = :exerciseId and c.checkId.username = :username")
    void deleteIfPresent(@Param("exerciseId") UUID exerciseId, @Param("username") String username);
}
