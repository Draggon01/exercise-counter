package org.exercise.counter.exercisecounter.web.rest.groups;

import org.exercise.counter.exercisecounter.web.rest.groups.dto.CreateGroupRequestDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.ExerciseGroupMappingDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.UserGroupMappingDto;
import org.exercise.counter.exercisecounter.web.service.GroupService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
public class GroupsController {

    private final GroupService groupService;

    public GroupsController(GroupService groupService) {
        this.groupService = groupService;
    }

    /** Exercise → group mappings, limited to the groups the current user is a member of. */
    @GetMapping("/exercises/list")
    public List<ExerciseGroupMappingDto> listExerciseGroups(@AuthenticationPrincipal UserDetails user) {
        return groupService.listExerciseGroups(user.getUsername());
    }

    /** Group memberships and invitations of the current user only. */
    @GetMapping("/user/list")
    public List<UserGroupMappingDto> listUserGroups(@AuthenticationPrincipal UserDetails user) {
        return List.of(groupService.userGroups(user.getUsername()));
    }

    @GetMapping("/public/search")
    public List<String> searchPublicGroups(@RequestParam String query) {
        return groupService.searchPublic(query);
    }

    @PostMapping("/user/create")
    public UserGroupMappingDto createGroupOnUser(@RequestBody CreateGroupRequestDto request, @AuthenticationPrincipal UserDetails user) {
        return groupService.create(request.groupName(), request.visibility(), user.getUsername());
    }

    @PostMapping("/user/join")
    public UserGroupMappingDto joinPublicGroup(@RequestBody String groupName, @AuthenticationPrincipal UserDetails user) {
        return groupService.joinPublic(groupName, user.getUsername());
    }

    @PostMapping("/user/delete")
    public UserGroupMappingDto deleteGroupOnUser(@RequestBody String groupName, @AuthenticationPrincipal UserDetails user) {
        return groupService.leave(groupName, user.getUsername());
    }

    @PostMapping("/user/accept")
    public UserGroupMappingDto acceptUserToGroup(@RequestBody String groupName, @AuthenticationPrincipal UserDetails user) {
        return groupService.acceptInvitation(groupName, user.getUsername());
    }

    @PostMapping("/user/invite")
    public Boolean inviteUserToGroup(@RequestBody Map<String, String> request, @AuthenticationPrincipal UserDetails user) {
        return groupService.invite(request.get("username"), request.get("groupName"), user.getUsername());
    }
}
