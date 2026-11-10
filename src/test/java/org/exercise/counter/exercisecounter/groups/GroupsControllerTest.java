package org.exercise.counter.exercisecounter.groups;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.groups.GroupRepository;
import org.exercise.counter.exercisecounter.web.data.groups.GroupVisibility;
import org.exercise.counter.exercisecounter.web.data.groups.UserGroupMappingRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.groups.GroupsController;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.CreateGroupRequestDto;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.GroupNameRequest;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.InviteRequest;
import org.exercise.counter.exercisecounter.web.rest.groups.dto.UserGroupMappingDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class GroupsControllerTest {

    private static final String GROUP = "grp-test-group";

    @Autowired private GroupsController groupsController;
    @Autowired private UserGroupMappingRepository userGroupMappingRepository;
    @Autowired private GroupRepository groupRepository;
    @Autowired private UserRepository userRepository;

    @BeforeEach
    void setup() {
        userGroupMappingRepository.deleteAll();
        groupRepository.deleteAll();
        for (String name : List.of("grp-alice", "grp-bob", "grp-carol")) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}x"));
            }
        }
        groupsController.createGroupOnUser(new CreateGroupRequestDto(GROUP, GroupVisibility.INVITE_ONLY), auth("grp-alice"));
    }

    @Test
    void member_canInvite() {
        Boolean result = groupsController.inviteUserToGroup(
                new InviteRequest("grp-carol", GROUP), auth("grp-alice"));

        assertTrue(result);
    }

    @Test
    void nonMember_cannotInvite() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                groupsController.inviteUserToGroup(new InviteRequest("grp-carol", GROUP), auth("grp-bob")));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void invitedButNotAccepted_cannotInvite() {
        groupsController.inviteUserToGroup(new InviteRequest("grp-bob", GROUP), auth("grp-alice"));

        assertThrows(ResponseStatusException.class, () ->
                groupsController.inviteUserToGroup(new InviteRequest("grp-carol", GROUP), auth("grp-bob")));
    }

    @Test
    void acceptInvitation_withNullInvitedFlag_doesNotFail() {
        groupsController.inviteUserToGroup(new InviteRequest("grp-bob", GROUP), auth("grp-alice"));
        userGroupMappingRepository.findByUserGroupMappingId_Username("grp-bob").forEach(m -> {
            m.setIsInvited(null);
            userGroupMappingRepository.save(m);
        });

        assertDoesNotThrow(() -> groupsController.acceptUserToGroup(new GroupNameRequest(GROUP), auth("grp-bob")));
    }

    @Test
    void lastMemberLeaving_deletesGroup() {
        groupsController.deleteGroupOnUser(new GroupNameRequest(GROUP), auth("grp-alice"));

        assertTrue(groupRepository.findByGroupName(GROUP).isEmpty());
    }

    @Test
    void listUserGroups_returnsOnlyCurrentUser() {
        List<UserGroupMappingDto> result = groupsController.listUserGroups(auth("grp-bob"));

        assertEquals(1, result.size());
        assertEquals("grp-bob", result.getFirst().username());
        assertTrue(result.getFirst().groupInformation().isEmpty(), "bob must not see alice's groups");
    }

    private static UserDetails auth(String username) {
        return new org.springframework.security.core.userdetails.User(
                username, "{noop}x", List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }
}
