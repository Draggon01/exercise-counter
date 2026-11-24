package org.exercise.counter.exercisecounter.web.data.groups;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ExerciseGroupMappingRepository extends JpaRepository<ExerciseGroupMapping, ExerciseGroupMappingId> {

    List<ExerciseGroupMapping> findByExerciseGroupMappingId_ExerciseId(UUID exerciseGroupMappingIdExerciseId);

    /** The user has joined (pending invitations do not count) one of the groups the exercise is shared with. */
    @Query("select count(m) > 0 from exercise_group_mapping m, user_group_mapping u "
            + "where m.exerciseGroupMappingId.exerciseId = :exerciseId "
            + "and u.userGroupMappingId.groupId = m.exerciseGroupMappingId.groupId "
            + "and u.userGroupMappingId.username = :username and (u.isInvited = false or u.isInvited is null)")
    boolean isSharedWithMember(@Param("exerciseId") UUID exerciseId, @Param("username") String username);

    /** The exercise's mappings with their group in one query. */
    @Query("select m from exercise_group_mapping m join fetch m.group "
            + "where m.exerciseGroupMappingId.exerciseId = :exerciseId")
    List<ExerciseGroupMapping> findWithGroupByExerciseId(@Param("exerciseId") UUID exerciseId);

    /** All mappings with their group in one query. */
    @Query("select m from exercise_group_mapping m join fetch m.group")
    List<ExerciseGroupMapping> findAllWithGroup();
}
