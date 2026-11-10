package org.exercise.counter.exercisecounter.web.rest.user;

import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.user.dto.RegisterDto;
import org.exercise.counter.exercisecounter.web.rest.user.dto.UserDto;
import org.exercise.counter.exercisecounter.web.service.InviteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
public class UserController {

    private final UserRepository userRepository;
    private final InviteService inviteService;

    public UserController(UserRepository userRepository, InviteService inviteService) {
        this.userRepository = userRepository;
        this.inviteService = inviteService;
    }

    @PostMapping("api/public/userinfo")
    public UserDto user(@AuthenticationPrincipal UserDetails user) {
        if (user != null) {
            return new UserDto(user.getUsername(), false);
        }
        return new UserDto("", true);
    }

    /** @return {@code true} if the username is still free */
    @PostMapping("api/public/checkUser")
    public Boolean user(@RequestBody String username) {
        return userRepository.findByUsername(username).isEmpty();
    }

    @PostMapping("api/public/register")
    public UserDto register(@RequestBody RegisterDto registerDto) {
        User user = inviteService.register(registerDto.username(), registerDto.password(), registerDto.registerId());
        return new UserDto(user.getUsername(), false);
    }

    /**
     * @param baseUrl origin of the frontend, e.g. {@code https://exercise-counter.de}
     */
    @PostMapping("api/user/getInviteLink")
    public String getInviteLink(@RequestBody String baseUrl, @AuthenticationPrincipal UserDetails user) {
        return inviteService.inviteLink(baseUrl, user.getUsername());
    }

    @PostMapping("api/public/isInviteLinkValid")
    public Boolean validateInviteLink(@RequestBody String registerId) {
        return inviteService.isValid(UUID.fromString(registerId));
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
