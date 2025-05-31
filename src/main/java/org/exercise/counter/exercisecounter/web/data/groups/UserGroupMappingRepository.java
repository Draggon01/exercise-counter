package org.exercise.counter.exercisecounter.web.data.groups;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserGroupMappingRepository extends JpaRepository<UserGroupMapping, UserGroupMappingId> {
    List<UserGroupMapping> findByUserGroupMappingId_Username(String username);
    List<UserGroupMapping> findByUserGroupMappingId_GroupId(UUID groupId);
}
