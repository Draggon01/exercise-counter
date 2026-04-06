package org.exercise.counter.exercisecounter.web.data.userselection;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserSelectionRepository extends JpaRepository<UserSelection, UserSelectionId> {
    List<UserSelection> findByUserSelectionId_Username(String username);

    List<UserSelection> findByUserSelectionId_UsernameOrderByPositionAsc(String username);

    @Query("SELECT MAX(u.position) FROM show_exercise_for_user u WHERE u.userSelectionId.username = :username")
    Optional<Integer> findMaxPositionByUsername(@Param("username") String username);
}
