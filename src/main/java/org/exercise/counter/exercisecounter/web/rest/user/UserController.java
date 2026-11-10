package org.exercise.counter.exercisecounter.web.rest.user;

import jakarta.servlet.http.HttpSession;
import org.springframework.transaction.annotation.Transactional;
import org.exercise.counter.exercisecounter.web.data.register.Register;
import org.exercise.counter.exercisecounter.web.data.register.RegisterRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.user.dto.RegisterDto;
import org.exercise.counter.exercisecounter.web.rest.user.dto.UserDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
public class UserController {

    private static final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final UserRepository userRepository;
    private final RegisterRepository registerRepository;

    public UserController(UserRepository userRepository, RegisterRepository registerRepository) {
        this.userRepository = userRepository;
        this.registerRepository = registerRepository;
    }

    @PostMapping("api/public/userinfo")
    public UserDto user(@AuthenticationPrincipal UserDetails user) {
        if (user != null) {
            return new UserDto(user.getUsername(), false);
        }
        return new UserDto("", true);
    }

    @PostMapping("api/public/checkUser")
    public Boolean user(@RequestBody String username) {
        return userRepository.findByUsername(username).isEmpty();
    }

    @PostMapping("api/public/register")
    @Transactional
    public UserDto register(@RequestBody RegisterDto registerDto) {
        Register register = registerRepository.findById(registerDto.registerId()).orElseThrow();
        String encode = "{bcrypt}" + passwordEncoder.encode(registerDto.password());
        User save = userRepository.save(new User(registerDto.username(), encode));
        registerRepository.deleteById(register.getRegisterId());
        return new UserDto(save.getUsername(), false);
    }

    static final int MAX_OPEN_INVITES = 10;

    /**
     * Returns an invite link for the current user. A user can have at most {@link #MAX_OPEN_INVITES}
     * unused links; once that is reached an existing one is handed out again.
     *
     * @param baseUrl origin of the frontend, e.g. {@code https://exercise-counter.de}
     *                (a bare host is accepted for older clients and gets {@code https://})
     */
    @PostMapping("api/user/getInviteLink")
    @Transactional
    public String getInviteLink(@RequestBody String baseUrl, @AuthenticationPrincipal UserDetails user) {
        List<Register> openInvites = registerRepository.findByIssuer(user.getUsername());
        Register register = openInvites.size() >= MAX_OPEN_INVITES
                ? openInvites.getFirst()
                : registerRepository.save(new Register(null, user.getUsername()));
        return inviteUrl(baseUrl, register.getRegisterId());
    }

    public static String inviteUrl(String baseUrl, UUID registerId) {
        String origin = baseUrl == null ? "" : baseUrl.trim();
        if (origin.length() >= 2 && origin.startsWith("\"") && origin.endsWith("\"")) {
            origin = origin.substring(1, origin.length() - 1); // body sent as JSON string
        }
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

    @PostMapping("api/public/isInviteLinkValid")
    public Boolean validateInviteLink(@RequestBody String registerId) {
        return registerRepository.findById(UUID.fromString(registerId)).isPresent();
    }

    @GetMapping("/api/auth/check")
    public ResponseEntity<?> healthCheck(@AuthenticationPrincipal UserDetails user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }


        return ResponseEntity.ok().body(Map.of(
                "authenticated", true,
                "username", user.getUsername()
        ));
    }
}
