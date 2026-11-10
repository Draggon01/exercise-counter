package org.exercise.counter.exercisecounter.user;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.register.Register;
import org.exercise.counter.exercisecounter.web.data.register.RegisterRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.service.InviteService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class RegistrationTest {

    private static final String ISSUER = "reg-issuer";
    private static final String EXISTING = "reg-existing";

    @Autowired private InviteService inviteService;
    @Autowired private RegisterRepository registerRepository;
    @Autowired private UserRepository userRepository;

    private UUID registerId;

    @BeforeEach
    void setup() {
        for (String name : new String[]{ISSUER, EXISTING}) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}original"));
            }
        }
        registerId = registerRepository.save(new Register(null, ISSUER)).getRegisterId();
    }

    @AfterEach
    void cleanup() {
        registerRepository.deleteAll(registerRepository.findByIssuer(ISSUER));
        userRepository.findByUsername("reg-new").ifPresent(userRepository::delete);
    }

    @Test
    void register_createsUserAndConsumesLink() {
        inviteService.register("reg-new", "secret", registerId);

        assertTrue(userRepository.findByUsername("reg-new").orElseThrow().getPassword().startsWith("{bcrypt}"));
        assertFalse(inviteService.isValid(registerId));
    }

    @Test
    void register_withExistingUsername_isRejected_andDoesNotOverwritePassword() {
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> inviteService.register(EXISTING, "hijack", registerId));

        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
        assertEquals("{noop}original", userRepository.findByUsername(EXISTING).orElseThrow().getPassword());
        assertTrue(inviteService.isValid(registerId), "link must not be consumed");
    }

    @Test
    void register_withUnknownLink_is404() {
        assertThrows(NotFoundException.class, () -> inviteService.register("reg-new", "secret", UUID.randomUUID()));
    }

    @Test
    void register_withBlankPassword_is400() {
        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> inviteService.register("reg-new", " ", registerId));

        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
    }
}
