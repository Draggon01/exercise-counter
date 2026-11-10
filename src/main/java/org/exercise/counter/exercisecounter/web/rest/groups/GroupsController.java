package org.exercise.counter.exercisecounter.web.rest.groups;

import org.exercise.counter.exercisecounter.web.rest.groups.dto.InviteRequest;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.GroupNameRequest;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.CreateGroupRequestDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.ExerciseGroupMappingDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.UserGroupMappingDto;
import org.exercise.counter.exercisecounter.web.service.GroupService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public UserGroupMappingDto joinPublicGroup(@RequestBody GroupNameRequest request, @AuthenticationPrincipal UserDetails user) {
        return groupService.joinPublic(request.groupName(), user.getUsername());
    }

    @PostMapping("/user/delete")
    public UserGroupMappingDto deleteGroupOnUser(@RequestBody GroupNameRequest request, @AuthenticationPrincipal UserDetails user) {
        return groupService.leave(request.groupName(), user.getUsername());
    }

    @PostMapping("/user/accept")
    public UserGroupMappingDto acceptUserToGroup(@RequestBody GroupNameRequest request, @AuthenticationPrincipal UserDetails user) {
        return groupService.acceptInvitation(request.groupName(), user.getUsername());
    }

    @PostMapping("/user/invite")
    public Boolean inviteUserToGroup(@RequestBody InviteRequest request, @AuthenticationPrincipal UserDetails user) {
        return groupService.invite(request.username(), request.groupName(), user.getUsername());
    }
}
