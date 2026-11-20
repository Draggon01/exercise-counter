package org.exercise.counter.exercisecounter.web.data.groups;

import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GroupRepository extends JpaRepository<Group, UUID> {
    List<Group> findByGroupName(String groupName);

    List<Group> findByGroupNameContainingIgnoreCaseAndVisibility(String groupName, GroupVisibility visibility);

    /** groups.creator is not mapped (no owner rights); account deletion removes the name. */
    @Modifying
    @Query(value = "update groups set creator = null where creator = :username", nativeQuery = true)
    void clearCreator(@Param("username") String username);
}
