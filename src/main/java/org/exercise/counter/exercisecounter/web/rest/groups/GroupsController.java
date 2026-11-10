package org.exercise.counter.exercisecounter.web.rest.groups;

import org.exercise.counter.exercisecounter.web.rest.groups.dto.CreateGroupRequestDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.ExerciseGroupMappingDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.InvitationRequest;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.UserGroupMappingDto;
import org.exercise.counter.exercisecounter.web.service.GroupService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Groups are addressed by name ({@code /api/groups/{groupName}/...}); names must be URL-encoded.
 */
@RestController
@RequestMapping("/api/groups")
public class GroupsController {

    private final GroupService groupService;

    public GroupsController(GroupService groupService) {
        this.groupService = groupService;
    }

    /** Exercise → group mappings, limited to the groups the current user is a member of. */
    @GetMapping("/exercise-mappings")
    public List<ExerciseGroupMappingDto> listExerciseMappings(@AuthenticationPrincipal UserDetails user) {
        return groupService.listExerciseGroups(user.getUsername());
    }

    /** Group memberships and invitations of the current user (a list with one entry). */
    @GetMapping("/mine")
    public List<UserGroupMappingDto> listMine(@AuthenticationPrincipal UserDetails user) {
        return List.of(groupService.userGroups(user.getUsername()));
    }

    /** Names of public groups containing {@code query}. */
    @GetMapping("/public")
    public List<String> searchPublic(@RequestParam String query) {
        return groupService.searchPublic(query);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserGroupMappingDto create(@RequestBody CreateGroupRequestDto request, @AuthenticationPrincipal UserDetails user) {
        return groupService.create(request.groupName(), request.visibility(), user.getUsername());
    }

    /** Join a public group. */
    @PostMapping("/{groupName}/join")
    public UserGroupMappingDto join(@PathVariable String groupName, @AuthenticationPrincipal UserDetails user) {
        return groupService.joinPublic(groupName, user.getUsername());
    }

    /** Accept an invitation. */
    @PostMapping("/{groupName}/accept")
    public UserGroupMappingDto accept(@PathVariable String groupName, @AuthenticationPrincipal UserDetails user) {
        return groupService.acceptInvitation(groupName, user.getUsername());
    }

    /** Leave the group or decline the invitation. */
    @DeleteMapping("/{groupName}/membership")
    public UserGroupMappingDto leave(@PathVariable String groupName, @AuthenticationPrincipal UserDetails user) {
        return groupService.leave(groupName, user.getUsername());
    }

    /** @return {@code false} if the user does not exist or is already in the group */
    @PostMapping("/{groupName}/invitations")
    public Boolean invite(@PathVariable String groupName, @RequestBody InvitationRequest request,
                          @AuthenticationPrincipal UserDetails user) {
        return groupService.invite(request.username(), groupName, user.getUsername());
    }
}
