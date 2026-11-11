package org.exercise.counter.exercisecounter.account;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.account.PasswordReset;
import org.exercise.counter.exercisecounter.web.data.account.PasswordResetRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.account.dto.PasswordResetLinkDto;
import org.exercise.counter.exercisecounter.web.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "app.admins=acc-admin, someone-else")
@Import(TestcontainersConfiguration.class)
class AccountServiceTest {

    private static final String ADMIN = "acc-admin";
    private static final String ANNA = "acc-anna";
    private static final PasswordEncoder ENCODER = PasswordEncoderFactories.createDelegatingPasswordEncoder();

    @Autowired private AccountService accountService;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordResetRepository resetRepository;

    @BeforeEach
    void setup() {
        for (String name : List.of(ADMIN, ANNA)) {
            userRepository.save(new User(name, ENCODER.encode("old-password")));
        }
        resetRepository.deleteAll();
    }

    private boolean passwordIs(String username, String password) {
        return ENCODER.matches(password, userRepository.findByUsername(username).orElseThrow().getPassword());
    }

    private static int status(Runnable action) {
        return assertThrows(ResponseStatusException.class, action::run).getStatusCode().value();
    }

    private static String token(PasswordResetLinkDto link) {
        return link.link().substring(link.link().lastIndexOf('/') + 1);
    }

    // ---- change password

    @Test
    void changePassword_withTheRightCurrentPassword() {
        accountService.changePassword(ANNA, "old-password", "new-password");

        assertTrue(passwordIs(ANNA, "new-password"));
        assertTrue(userRepository.findByUsername(ANNA).orElseThrow().getPassword().startsWith("{bcrypt}"));
    }

    @Test
    void changePassword_rejectsAWrongCurrentPassword_andShortNewOnes() {
        assertEquals(400, status(() -> accountService.changePassword(ANNA, "wrong", "new-password")));
        assertEquals(400, status(() -> accountService.changePassword(ANNA, "old-password", "short")));
        assertTrue(passwordIs(ANNA, "old-password"));
    }

    // ---- admins and reset links

    @Test
    void adminsComeFromTheConfiguration() {
        assertTrue(accountService.isAdmin(ADMIN));
        assertTrue(accountService.isAdmin("someone-else"), "spaces after commas are ignored");
        assertFalse(accountService.isAdmin(ANNA));
    }

    @Test
    void nonAdmins_cannotListUsersOrCreateLinks() {
        assertEquals(403, status(() -> accountService.listUsernames(ANNA)));
        assertEquals(403, status(() -> accountService.createResetLink(ANNA, ADMIN, "https://exercise-counter.de")));
        assertTrue(resetRepository.findAll().isEmpty());
    }

    @Test
    void resetLink_setsANewPassword_once() {
        PasswordResetLinkDto link = accountService.createResetLink(ADMIN, ANNA, "https://exercise-counter.de/options");

        assertTrue(link.link().startsWith("https://exercise-counter.de/reset-password/"), link.link());
        assertEquals(ANNA, accountService.resetInfo(token(link)).username());

        accountService.resetPassword(token(link), "brand-new-password");

        assertTrue(passwordIs(ANNA, "brand-new-password"));
        assertEquals(404, status(() -> accountService.resetInfo(token(link))), "used up");
        assertEquals(404, status(() -> accountService.resetPassword(token(link), "another-password")));
    }

    @Test
    void onlyTheHashOfTheTokenIsStored() {
        PasswordResetLinkDto link = accountService.createResetLink(ADMIN, ANNA, "https://exercise-counter.de");

        PasswordReset stored = resetRepository.findAll().getFirst();
        assertNotEquals(token(link), stored.getTokenHash());
        assertEquals(AccountService.hash(token(link)), stored.getTokenHash());
    }

    @Test
    void aNewLink_replacesTheOldOne() {
        PasswordResetLinkDto first = accountService.createResetLink(ADMIN, ANNA, "https://exercise-counter.de");
        PasswordResetLinkDto second = accountService.createResetLink(ADMIN, ANNA, "https://exercise-counter.de");

        assertEquals(404, status(() -> accountService.resetInfo(token(first))));
        assertEquals(ANNA, accountService.resetInfo(token(second)).username());
    }

    @Test
    void expiredLinks_doNotWork() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        resetRepository.save(new PasswordReset(AccountService.hash("old-token"), ANNA, ADMIN, now.minusDays(2), now.minusDays(1)));

        assertEquals(404, status(() -> accountService.resetInfo("old-token")));
        assertEquals(404, status(() -> accountService.resetPassword("old-token", "new-password")));
        assertTrue(passwordIs(ANNA, "old-password"));
    }

    @Test
    void resetPassword_alsoNeedsALongEnoughPassword() {
        PasswordResetLinkDto link = accountService.createResetLink(ADMIN, ANNA, "https://exercise-counter.de");

        assertEquals(400, status(() -> accountService.resetPassword(token(link), "short")));
        assertEquals(ANNA, accountService.resetInfo(token(link)).username(), "a failed try does not use up the link");
    }

    @Test
    void unknownUsers_andGarbageTokens() {
        assertEquals(404, status(() -> accountService.createResetLink(ADMIN, "nobody-here", "https://exercise-counter.de")));
        assertEquals(404, status(() -> accountService.resetInfo("not-a-token")));
    }
}
