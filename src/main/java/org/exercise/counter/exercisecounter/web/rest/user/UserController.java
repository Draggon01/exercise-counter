package org.exercise.counter.exercisecounter.web.rest.user;

import org.exercise.counter.exercisecounter.web.rest.user.dto.UserDto;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    @PostMapping("api/public/userinfo")
    public UserDto user(Authentication authenticator) {
        if (authenticator != null) {
            UserDetails user = (UserDetails) authenticator.getPrincipal();
            return new UserDto(user.getUsername(), false);
        }
        return new UserDto("", true);
    }

}
