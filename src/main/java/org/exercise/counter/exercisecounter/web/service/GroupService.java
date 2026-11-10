package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.groups.*;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.error.ForbiddenException;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.ExerciseGroupMappingDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.GroupInformationDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.UserGroupMappingDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Groups: creating, joining, leaving, invitations, and which exercises are shared with them.
 */
@Service
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserGroupMappingRepository userGroupMappingRepository;
    private final ExerciseGroupMappingRepository exerciseGroupMappingRepository;
    private final UserRepository userRepository;

    public GroupService(GroupRepository groupRepository,
                        UserGroupMappingRepository userGroupMappingRepository,
                        ExerciseGroupMappingRepository exerciseGroupMappingRepository,
                        UserRepository userRepository) {
        this.groupRepository = groupRepository;
        this.userGroupMappingRepository = userGroupMappingRepository;
        this.exerciseGroupMappingRepository = exerciseGroupMappingRepository;
        this.userRepository = userRepository;
    }

    /** Exercise → group names, limited to the groups the user is a member of. */
    @Transactional(readOnly = true)
    public List<ExerciseGroupMappingDto> listExerciseGroups(String username) {
        Set<UUID> memberGroupIds = memberGroupIds(username);
        return exerciseGroupMappingRepository.findAllWithGroup().stream()
                .filter(mapping -> memberGroupIds.contains(mapping.getGroup().getGroupId()))
                .collect(Collectors.groupingBy(
                        mapping -> mapping.getExerciseGroupMappingId().getExerciseId(),
                        Collectors.mapping(mapping -> mapping.getGroup().getGroupName(), Collectors.toList())))
                .entrySet().stream()
                .map(entry -> new ExerciseGroupMappingDto(entry.getKey(), entry.getValue()))
                .toList();
    }

    /** The user's memberships and pending invitations. */
    @Transactional(readOnly = true)
    public UserGroupMappingDto userGroups(String username) {
        return new UserGroupMappingDto(username, userGroupMappingRepository.findWithGroupByUsername(username)
                .stream()
                .map(mapping -> new GroupInformationDto(
                        mapping.getGroup() == null ? null : mapping.getGroup().getGroupName(),
                        isInvitation(mapping),
                        mapping.getGroup() == null ? null : mapping.getGroup().getVisibility()))
                .toList());
    }

    @Transactional(readOnly = true)
    public List<String> searchPublic(String query) {
        return groupRepository.findByGroupNameContainingIgnoreCaseAndVisibility(query, GroupVisibility.PUBLIC).stream()
                .map(Group::getGroupName)
                .toList();
    }

    /** Creates a group with the user as its first member. */
    @Transactional
    public UserGroupMappingDto create(String groupName, GroupVisibility visibility, String username) {
        if (groupName == null || groupName.isBlank() || groupName.contains("/") || groupName.contains("\\")) {
            // names are used in URLs (/api/groups/{groupName}/...), where encoded slashes are rejected
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group name must not be empty or contain / or \\");
        }
        Group group = new Group();
        group.setGroupName(groupName);
        group.setVisibility(visibility != null ? visibility : GroupVisibility.INVITE_ONLY);
        Group saved = groupRepository.save(group);

        UserGroupMapping membership = new UserGroupMapping(username, saved.getGroupId());
        membership.setGroup(saved);
        userGroupMappingRepository.save(membership);
        return userGroups(username);
    }

    @Transactional
    public UserGroupMappingDto joinPublic(String groupName, String username) {
        Group group = findByName(groupName).orElseThrow(() -> new NotFoundException("Group not found"));
        if (group.getVisibility() != GroupVisibility.PUBLIC) {
            throw new ForbiddenException("Group is not public");
        }
        UserGroupMappingId id = new UserGroupMappingId(username, group.getGroupId());
        if (!userGroupMappingRepository.existsById(id)) {
            userGroupMappingRepository.save(new UserGroupMapping(username, group.getGroupId()));
        }
        return userGroups(username);
    }

    /** Leaves a group (or declines an invitation). The last member leaving deletes the group. */
    @Transactional
    public UserGroupMappingDto leave(String groupName, String username) {
        membership(groupName, username).ifPresent(mapping -> {
            UUID groupId = mapping.getGroup().getGroupId();
            userGroupMappingRepository.deleteById(mapping.getUserGroupMappingId());
            if (userGroupMappingRepository.findByUserGroupMappingId_GroupId(groupId).isEmpty()) {
                groupRepository.deleteById(groupId);
            }
        });
        return userGroups(username);
    }

    @Transactional
    public UserGroupMappingDto acceptInvitation(String groupName, String username) {
        membership(groupName, username)
                .filter(GroupService::isInvitation)
                .ifPresent(mapping -> {
                    mapping.setIsInvited(false);
                    userGroupMappingRepository.save(mapping);
                });
        return userGroups(username);
    }

    /**
     * Invites {@code invitee} to the group. Only (non-invited) members may invite.
     *
     * @return {@code false} if the group or user does not exist or the user is already in the group
     */
    @Transactional
    public boolean invite(String invitee, String groupName, String inviter) {
        Optional<Group> group = findByName(groupName);
        if (group.isEmpty()) {
            return false;
        }
        UUID groupId = group.get().getGroupId();
        if (!memberGroupIds(inviter).contains(groupId)) {
            throw new ForbiddenException("Only members can invite to a group");
        }
        if (userRepository.findByUsername(invitee).isEmpty()) {
            return false;
        }
        UserGroupMappingId id = new UserGroupMappingId(invitee, groupId);
        if (userGroupMappingRepository.existsById(id)) {
            return false;
        }
        UserGroupMapping invitation = new UserGroupMapping();
        invitation.setUserGroupMappingId(id);
        invitation.setIsInvited(true);
        userGroupMappingRepository.save(invitation);
        return true;
    }

    private Optional<Group> findByName(String groupName) {
        List<Group> groups = groupRepository.findByGroupName(groupName);
        return groups.size() == 1 ? Optional.of(groups.getFirst()) : Optional.empty();
    }

    private Optional<UserGroupMapping> membership(String groupName, String username) {
        return userGroupMappingRepository.findWithGroupByUsername(username).stream()
                .filter(mapping -> mapping.getGroup().getGroupName().equals(groupName))
                .findFirst();
    }

    private static boolean isInvitation(UserGroupMapping mapping) {
        return Boolean.TRUE.equals(mapping.getIsInvited());
    }

    /** Ids of the groups the user has joined (pending invitations do not count). */
    private Set<UUID> memberGroupIds(String username) {
        return userGroupMappingRepository.findWithGroupByUsername(username).stream()
                .filter(mapping -> !isInvitation(mapping))
                .map(mapping -> mapping.getUserGroupMappingId().getGroupId())
                .collect(Collectors.toSet());
    }
}
