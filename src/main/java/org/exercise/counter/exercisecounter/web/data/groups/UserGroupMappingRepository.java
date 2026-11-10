package org.exercise.counter.exercisecounter.web.data.groups;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface UserGroupMappingRepository extends JpaRepository<UserGroupMapping, UserGroupMappingId> {
    List<UserGroupMapping> findByUserGroupMappingId_Username(String username);

    /** The user's memberships with their group in one query. */
    @Query("select m from user_group_mapping m left join fetch m.group where m.userGroupMappingId.username = :username")
    List<UserGroupMapping> findWithGroupByUsername(@Param("username") String username);
    List<UserGroupMapping> findByUserGroupMappingId_GroupId(UUID groupId);
}
