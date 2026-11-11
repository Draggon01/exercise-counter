package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.account.PasswordReset;
import org.exercise.counter.exercisecounter.web.data.account.PasswordResetRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.account.dto.PasswordResetInfoDto;
import org.exercise.counter.exercisecounter.web.rest.account.dto.PasswordResetLinkDto;
import org.exercise.counter.exercisecounter.web.rest.error.ForbiddenException;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Passwords: users change their own; admins ({@code app.admins}) create one-time links for people who
 * forgot theirs (valid {@link #RESET_LINK_VALIDITY}, only the token's hash is stored).
 */
@Service
public class AccountService {

    public static final int MIN_PASSWORD_LENGTH = 8;
    public static final Duration RESET_LINK_VALIDITY = Duration.ofHours(24);

    private static final Logger log = LoggerFactory.getLogger(AccountService.class);
    /** Reads every stored format ({bcrypt}, {noop} of the dev user), writes {bcrypt}. */
    private static final PasswordEncoder PASSWORD_ENCODER = PasswordEncoderFactories.createDelegatingPasswordEncoder();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetRepository resetRepository;
    private final Set<String> admins;
    private final Clock clock;

    /**
     * @param admins {@code app.admins}: usernames that may create reset links (comma separated, env APP_ADMINS)
     */
    public AccountService(UserRepository userRepository, PasswordResetRepository resetRepository,
                          @Value("${app.admins:}") List<String> admins, Clock clock) {
        this.userRepository = userRepository;
        this.resetRepository = resetRepository;
        this.admins = admins.stream().map(String::trim).filter(a -> !a.isEmpty()).collect(Collectors.toUnmodifiableSet());
        this.clock = clock;
    }

    public boolean isAdmin(String username) {
        return username != null && admins.contains(username);
    }

    @Transactional
    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username).orElseThrow(() -> new NotFoundException("User not found"));
        if (currentPassword == null || !PASSWORD_ENCODER.matches(currentPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The current password is wrong");
        }
        setPassword(user, newPassword);
        log.info("User {} changed their password", username);
    }

    /** Usernames to pick from when creating a reset link (admins only). */
    @Transactional(readOnly = true)
    public List<String> listUsernames(String admin) {
        requireAdmin(admin);
        return userRepository.findAllUsernames();
    }

    /**
     * Creates a link for {@code username} to set a new password; older links of that user stop working.
     *
     * @param baseUrl origin of the frontend, e.g. {@code https://exercise-counter.de}
     */
    @Transactional
    public PasswordResetLinkDto createResetLink(String admin, String username, String baseUrl) {
        requireAdmin(admin);
        if (username == null || userRepository.findByUsername(username).isEmpty()) {
            throw new NotFoundException("User not found");
        }
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        LocalDateTime now = now();
        resetRepository.deleteExpired(now);
        resetRepository.deleteByUsername(username);
        PasswordReset reset = resetRepository.save(
                new PasswordReset(hash(token), username, admin, now, now.plus(RESET_LINK_VALIDITY)));
        log.info("{} created a password reset link for {}", admin, username);
        return new PasswordResetLinkDto(InviteService.appUrl(baseUrl, "/reset-password/" + token), username,
                reset.getExpiresAt().atOffset(ZoneOffset.UTC).toInstant());
    }

    /** For the reset page: whose password the link sets (404 if unknown or expired). */
    @Transactional(readOnly = true)
    public PasswordResetInfoDto resetInfo(String token) {
        return new PasswordResetInfoDto(validReset(token).getUsername());
    }

    /** Sets the new password and uses up the link. */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordReset reset = validReset(token);
        User user = userRepository.findByUsername(reset.getUsername())
                .orElseThrow(() -> new NotFoundException("This link is not valid (anymore)"));
        setPassword(user, newPassword);
        resetRepository.delete(reset);
        log.info("Password of {} was reset with a link created by {}", user.getUsername(), reset.getCreatedBy());
    }

    private PasswordReset validReset(String token) {
        if (token == null || token.isBlank()) {
            throw new NotFoundException("This link is not valid (anymore)");
        }
        return resetRepository.findById(hash(token))
                .filter(reset -> reset.getExpiresAt().isAfter(now()))
                .orElseThrow(() -> new NotFoundException("This link is not valid (anymore)"));
    }

    private void setPassword(User user, String newPassword) {
        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The new password needs at least " + MIN_PASSWORD_LENGTH + " characters");
        }
        user.setPassword(PASSWORD_ENCODER.encode(newPassword));
        userRepository.save(user);
    }

    private void requireAdmin(String username) {
        if (!isAdmin(username)) {
            throw new ForbiddenException("Only admins can do this");
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock.withZone(ZoneOffset.UTC));
    }

    /** SHA-256 (hex) of a reset token – what the database stores instead of the token. */
    public static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
