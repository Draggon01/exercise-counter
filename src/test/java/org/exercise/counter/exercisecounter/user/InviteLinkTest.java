package org.exercise.counter.exercisecounter.user;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.register.RegisterRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.user.UserController;
import org.exercise.counter.exercisecounter.web.rest.user.dto.InviteLinkRequest;
import org.exercise.counter.exercisecounter.web.service.InviteService;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class InviteLinkTest {

    private static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Test
    void usesOriginAsSent() {
        assertEquals("http://localhost:5173/register/" + ID, InviteService.inviteUrl("http://localhost:5173", ID));
        assertEquals("https://exercise-counter.de/register/" + ID, InviteService.inviteUrl("https://exercise-counter.de/", ID));
    }

    @Test
    void bareHostFromOldClients_getsHttps() {
        assertEquals("https://exercise-counter.de/register/" + ID, InviteService.inviteUrl("exercise-counter.de", ID));
    }

    @Test
    void pathAndQueryAreDropped() {
        assertEquals("https://a.de/register/" + ID, InviteService.inviteUrl("https://a.de/some/path?x=1", ID));
    }

    @Test
    void invalidOrNonHttpUrl_isRejected() {
        assertThrows(ResponseStatusException.class, () -> InviteService.inviteUrl("javascript://alert(1)", ID));
        assertThrows(ResponseStatusException.class, () -> InviteService.inviteUrl("", ID));
        assertThrows(ResponseStatusException.class, () -> InviteService.inviteUrl("http://exa mple.de", ID));
    }

    @Nested
    @SpringBootTest
    @Import(TestcontainersConfiguration.class)
    class Cap {

        private static final String ISSUER = "invite-issuer";

        @Autowired private UserController userController;
        @Autowired private RegisterRepository registerRepository;
        @Autowired private UserRepository userRepository;

        @Test
        void atMostTenOpenInvitesPerUser() {
            if (userRepository.findByUsername(ISSUER).isEmpty()) {
                userRepository.save(new User(ISSUER, "{noop}x"));
            }
            registerRepository.deleteAll(registerRepository.findByIssuer(ISSUER));

            Set<String> links = new HashSet<>();
            for (int i = 0; i < 15; i++) {
                links.add(userController.createInvite(new InviteLinkRequest("https://a.de"), auth()));
            }

            assertEquals(10, registerRepository.findByIssuer(ISSUER).size());
            assertEquals(10, links.size(), "after the cap an existing link is reused");
            registerRepository.deleteAll(registerRepository.findByIssuer(ISSUER));
        }

        private UserDetails auth() {
            return new org.springframework.security.core.userdetails.User(
                    ISSUER, "{noop}x", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        }
    }
}
