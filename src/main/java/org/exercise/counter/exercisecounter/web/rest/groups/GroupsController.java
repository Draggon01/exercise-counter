package org.exercise.counter.exercisecounter.web.rest.groups;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.exercise.counter.exercisecounter.web.data.groups.*;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.CreateGroupRequestDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.GroupInformationDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.UserGroupMappingDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.ExerciseGroupMappingDto;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController()
@RequestMapping("/api/groups")
public class GroupsController {

    private final ExerciseGroupMappingRepository exerciseGroupMappingRepository;
    private final UserGroupMappingRepository userGroupMappingRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

    public GroupsController(ExerciseGroupMappingRepository exerciseGroupMappingRepository, UserGroupMappingRepository userGroupMappingRepository, GroupRepository groupRepository, UserRepository userRepository) {
        this.exerciseGroupMappingRepository = exerciseGroupMappingRepository;
        this.userGroupMappingRepository = userGroupMappingRepository;
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/exercises/list")
    public List<ExerciseGroupMappingDto> listExerciseGroups() {
        return exerciseGroupMappingRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                        mapping -> mapping.getExerciseGroupMappingId().getExerciseId(),
                        Collectors.mapping(mapping -> mapping.getGroup().getGroupName(), Collectors.toList())))
                .entrySet().stream()
                .map(entry -> new ExerciseGroupMappingDto(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
    }

    @GetMapping("/user/list")
    public List<UserGroupMappingDto> listUserGroups() {
        return userGroupMappingRepository.findAll().stream()
                .collect(Collectors.groupingBy(
                        mapping -> mapping.getUserGroupMappingId().getUsername(),
                        Collectors.mapping(mapping -> new GroupInformationDto(
                                mapping.getGroup().getGroupName(),
                                mapping.getIsInvited(),
                                mapping.getGroup().getVisibility()), Collectors.toList())))
                .entrySet().stream()
                .map(entry -> new UserGroupMappingDto(entry.getKey(), entry.getValue()))
                .toList();
    }

    @GetMapping("/public/search")
    public List<String> searchPublicGroups(@RequestParam String query) {
        return groupRepository.findByGroupNameContainingIgnoreCaseAndVisibility(query, GroupVisibility.PUBLIC)
                .stream()
                .map(Group::getGroupName)
                .toList();
    }

    @PostMapping("/user/create")
    public UserGroupMappingDto createGroupOnUser(@RequestBody CreateGroupRequestDto request, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        Group group = new Group();
        group.setGroupName(request.groupName());
        group.setVisibility(request.visibility() != null ? request.visibility() : GroupVisibility.INVITE_ONLY);
        Group save = groupRepository.save(group);
        userGroupMappingRepository.save(new UserGroupMapping(username, save.getGroupId()));

        return buildUserMappingDto(username);
    }

    @PostMapping("/user/join")
    public UserGroupMappingDto joinPublicGroup(@RequestBody String groupName, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        List<Group> byGroupName = groupRepository.findByGroupName(groupName);
        if (byGroupName.size() != 1) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }

        Group group = byGroupName.getFirst();
        if (group.getVisibility() != GroupVisibility.PUBLIC) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Group is not public");
        }

        Optional<UserGroupMapping> existing = userGroupMappingRepository.findById(
                new UserGroupMappingId(username, group.getGroupId()));
        if (existing.isEmpty()) {
            userGroupMappingRepository.save(new UserGroupMapping(username, group.getGroupId()));
        }

        return buildUserMappingDto(username);
    }

    @PostMapping("/user/delete")
    public UserGroupMappingDto deleteGroupOnUser(@RequestBody String groupName, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        UserGroupMapping userGroupMapping = userGroupMappingRepository.findByUserGroupMappingId_Username(username)
                .stream()
                .filter(mapping -> mapping.getGroup().getGroupName().equals(groupName))
                .findFirst().orElse(null);

        if (userGroupMapping != null) {
            userGroupMappingRepository.deleteById(userGroupMapping.getUserGroupMappingId());
            if (userGroupMappingRepository.findByUserGroupMappingId_GroupId(userGroupMapping.getGroup().getGroupId()).isEmpty()) {
                groupRepository.deleteById(userGroupMapping.getGroup().getGroupId());
            }
        }

        return buildUserMappingDto(username);
    }

    @PostMapping("/user/accept")
    public UserGroupMappingDto acceptUserToGroup(@RequestBody String groupName, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        Optional<UserGroupMapping> first = userGroupMappingRepository.findByUserGroupMappingId_Username(username)
                .stream()
                .filter(mapping -> mapping.getGroup().getGroupName().equals(groupName) && mapping.getIsInvited())
                .findFirst();
        if (first.isPresent()) {
            first.get().setIsInvited(false);
            userGroupMappingRepository.save(first.get());
        }

        return buildUserMappingDto(username);
    }

    @PostMapping("/user/invite")
    public Boolean inviteUserToGroup(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String groupName = request.get("groupName");

        Optional<User> byUsername = userRepository.findByUsername(username);
        if (byUsername.isEmpty()) {
            return false;
        }

        List<Group> byGroupName = groupRepository.findByGroupName(groupName);
        if (byGroupName.size() != 1) {
            return false;
        }

        Optional<UserGroupMapping> byId = userGroupMappingRepository.findById(new UserGroupMappingId(username, byGroupName.getFirst().getGroupId()));
        if (byId.isPresent()) {
            return false;
        }

        UserGroupMapping userGroupMapping = new UserGroupMapping();
        userGroupMapping.setUserGroupMappingId(new UserGroupMappingId(username, byGroupName.getFirst().getGroupId()));
        userGroupMapping.setIsInvited(true);

        userGroupMappingRepository.save(userGroupMapping);
        return true;
    }

    private UserGroupMappingDto buildUserMappingDto(String username) {
        return new UserGroupMappingDto(
                username,
                userGroupMappingRepository.findByUserGroupMappingId_Username(username)
                        .stream()
                        .map(mapping -> new GroupInformationDto(
                                mapping.getGroup() == null ? null : mapping.getGroup().getGroupName(),
                                mapping.getIsInvited() != null && mapping.getIsInvited(),
                                mapping.getGroup() == null ? null : mapping.getGroup().getVisibility()))
                        .toList());
    }
}
