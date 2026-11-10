package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.register.Register;
import org.exercise.counter.exercisecounter.web.data.register.RegisterRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Invite links and registration of new users through them.
 */
@Service
public class InviteService {

    /** A user can have at most this many unused invite links. */
    public static final int MAX_OPEN_INVITES = 10;

    private static final PasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    private final RegisterRepository registerRepository;
    private final UserRepository userRepository;

    public InviteService(RegisterRepository registerRepository, UserRepository userRepository) {
        this.registerRepository = registerRepository;
        this.userRepository = userRepository;
    }

    /**
     * Returns an invite link of the user. Once {@link #MAX_OPEN_INVITES} unused links exist, an existing
     * one is handed out again.
     *
     * @param baseUrl origin of the frontend, e.g. {@code https://exercise-counter.de}
     */
    @Transactional
    public String inviteLink(String baseUrl, String issuer) {
        List<Register> openInvites = registerRepository.findByIssuer(issuer);
        Register register = openInvites.size() >= MAX_OPEN_INVITES
                ? openInvites.getFirst()
                : registerRepository.save(new Register(null, issuer));
        return inviteUrl(baseUrl, register.getRegisterId());
    }

    @Transactional(readOnly = true)
    public boolean isValid(UUID registerId) {
        return registerRepository.existsById(registerId);
    }

    /**
     * Creates a new user with an invite link and consumes the link.
     *
     * @throws NotFoundException       if the invite link does not exist (anymore)
     * @throws ResponseStatusException 409 if the username is taken, 400 if username or password is blank
     */
    @Transactional
    public User register(String username, String password, UUID registerId) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required");
        }
        Register register = registerRepository.findById(registerId)
                .orElseThrow(() -> new NotFoundException("Invite link not found"));
        if (userRepository.findByUsername(username).isPresent()) {
            // saving would otherwise overwrite the existing user's password
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
        }
        User user = userRepository.save(new User(username, "{bcrypt}" + PASSWORD_ENCODER.encode(password)));
        registerRepository.deleteById(register.getRegisterId());
        return user;
    }

    /**
     * Builds {@code <origin>/register/<id>}. Accepts a full origin or a bare host (gets {@code https://});
     * path and query are dropped.
     */
    public static String inviteUrl(String baseUrl, UUID registerId) {
        String origin = baseUrl == null ? "" : baseUrl.trim();
        if (!origin.contains("://")) {
            origin = "https://" + origin;
        }
        URI uri;
        try {
            uri = URI.create(origin);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid base url");
        }
        String scheme = uri.getScheme();
        if (uri.getHost() == null || !("http".equals(scheme) || "https".equals(scheme))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid base url");
        }
        String port = uri.getPort() == -1 ? "" : ":" + uri.getPort();
        return scheme + "://" + uri.getHost() + port + "/register/" + registerId;
    }
}
