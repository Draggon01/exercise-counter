package org.exercise.counter.exercisecounter.web.rest.user;

import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.user.dto.InviteLinkRequest;
import org.exercise.counter.exercisecounter.web.rest.user.dto.RegisterDto;
import org.exercise.counter.exercisecounter.web.rest.user.dto.UserDto;
import org.exercise.counter.exercisecounter.web.service.AccountService;
import org.exercise.counter.exercisecounter.web.service.InviteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Current user, registration with invite links and the session check.
 * Login and logout ({@code /api/login}, {@code /api/logout}) are handled by Spring Security.
 */
@RestController
@RequestMapping("/api")
public class UserController {

    private final UserRepository userRepository;
    private final InviteService inviteService;
    private final AccountService accountService;

    public UserController(UserRepository userRepository, InviteService inviteService, AccountService accountService) {
        this.userRepository = userRepository;
        this.inviteService = inviteService;
        this.accountService = accountService;
    }

    /** The logged-in user, or an anonymous user. */
    @GetMapping("/public/userinfo")
    public UserDto userInfo(@AuthenticationPrincipal UserDetails user) {
        if (user != null) {
            return new UserDto(user.getUsername(), false, accountService.isAdmin(user.getUsername()));
        }
        return new UserDto("", true, false);
    }

    /** @return {@code true} if the username is still free */
    @GetMapping("/public/username-available")
    public Boolean isUsernameAvailable(@RequestParam String username) {
        return userRepository.findByUsername(username).isEmpty();
    }

    @PostMapping("/public/register")
    public UserDto register(@RequestBody RegisterDto registerDto) {
        User user = inviteService.register(registerDto.username(), registerDto.password(), registerDto.registerId());
        return new UserDto(user.getUsername(), false, false);
    }

    @GetMapping("/public/invites/{registerId}/valid")
    public Boolean isInviteValid(@PathVariable UUID registerId) {
        return inviteService.isValid(registerId);
    }

    /** Returns an invite link of the current user (plain text). */
    @PostMapping("/invites")
    public String createInvite(@RequestBody InviteLinkRequest request, @AuthenticationPrincipal UserDetails user) {
        return inviteService.inviteLink(request.baseUrl(), user.getUsername());
    }

    @GetMapping("/auth/check")
    public ResponseEntity<?> checkSession(@AuthenticationPrincipal UserDetails user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok().body(Map.of(
                "authenticated", true,
                "username", user.getUsername()
        ));
    }
}
