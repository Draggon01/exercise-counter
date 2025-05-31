package org.exercise.counter.exercisecounter.web.data.groups;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GroupRepository extends JpaRepository<Group, UUID> {
    List<Group> findByGroupName(String groupName);
}
