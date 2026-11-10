package org.exercise.counter.exercisecounter.web.data.groups;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface UserGroupMappingRepository extends JpaRepository<UserGroupMapping, UserGroupMappingId> {
    List<UserGroupMapping> findByUserGroupMappingId_Username(String username);

    /** The user's memberships with their group in one query. */
    @Query("select m from user_group_mapping m left join fetch m.group where m.userGroupMappingId.username = :username")
    List<UserGroupMapping> findWithGroupByUsername(@Param("username") String username);

    /** Members (pending invitations excluded) of the given groups, in one query. */
    @Query("select new org.exercise.counter.exercisecounter.web.data.groups.GroupMemberCount("
            + "m.userGroupMappingId.groupId, count(m)) from user_group_mapping m "
            + "where m.userGroupMappingId.groupId in :groupIds and (m.isInvited = false or m.isInvited is null) "
            + "group by m.userGroupMappingId.groupId")
    List<GroupMemberCount> countMembers(@Param("groupIds") Collection<UUID> groupIds);
    List<UserGroupMapping> findByUserGroupMappingId_GroupId(UUID groupId);
}
