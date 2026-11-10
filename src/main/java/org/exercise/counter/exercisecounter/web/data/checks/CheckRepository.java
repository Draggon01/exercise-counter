package org.exercise.counter.exercisecounter.web.data.checks;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CheckRepository extends JpaRepository<Check, CheckId> {

    List<Check> findByCheckIdExerciseIdIn(Collection<UUID> exerciseIds);
    List<Check> findCheckByCheckIdExerciseId(UUID exerciseId);

    List<Check> findCheckByCheckIdUsername(String username);

    List<Check> findByCheckIdUsernameIn(Collection<String> usernames);
}
