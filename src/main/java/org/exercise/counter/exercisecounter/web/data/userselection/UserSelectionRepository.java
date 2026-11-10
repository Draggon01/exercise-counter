package org.exercise.counter.exercisecounter.web.data.userselection;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSelectionRepository extends JpaRepository<UserSelection, UserSelectionId> {
    List<UserSelection> findByUserSelectionId_Username(String username);

    List<UserSelection> findByUserSelectionId_UsernameOrderByPositionAsc(String username);

    /** Like {@link #findByUserSelectionId_UsernameOrderByPositionAsc} but loads the exercises in the same query. */
    @Query("select s from show_exercise_for_user s join fetch s.exercise "
            + "where s.userSelectionId.username = :username order by s.position asc")
    List<UserSelection> findWithExerciseByUsername(@Param("username") String username);

    /** Users who have the exercise on their home page. */
    @Query("select s.userSelectionId.username from show_exercise_for_user s "
            + "where s.userSelectionId.exerciseId = :exerciseId order by s.userSelectionId.username")
    List<String> findUsernamesByExerciseId(@Param("exerciseId") UUID exerciseId);

    @Query("SELECT MAX(u.position) FROM show_exercise_for_user u WHERE u.userSelectionId.username = :username")
    Optional<Integer> findMaxPositionByUsername(@Param("username") String username);
}
