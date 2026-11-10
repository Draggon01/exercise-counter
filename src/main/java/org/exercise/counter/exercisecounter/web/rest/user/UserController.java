package org.exercise.counter.exercisecounter.web.rest.user;

import org.exercise.counter.exercisecounter.web.rest.user.dto.UsernameRequest;
import org.exercise.counter.exercisecounter.web.rest.user.dto.RegisterIdRequest;
import org.exercise.counter.exercisecounter.web.rest.user.dto.InviteLinkRequest;
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
    public Boolean user(@RequestBody UsernameRequest request) {
        return userRepository.findByUsername(request.username()).isEmpty();
    }

    @PostMapping("api/public/register")
    public UserDto register(@RequestBody RegisterDto registerDto) {
        User user = inviteService.register(registerDto.username(), registerDto.password(), registerDto.registerId());
        return new UserDto(user.getUsername(), false);
    }

    @PostMapping("api/user/getInviteLink")
    public String getInviteLink(@RequestBody InviteLinkRequest request, @AuthenticationPrincipal UserDetails user) {
        return inviteService.inviteLink(request.baseUrl(), user.getUsername());
    }

    @PostMapping("api/public/isInviteLinkValid")
    public Boolean validateInviteLink(@RequestBody RegisterIdRequest request) {
        return inviteService.isValid(request.registerId());
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
