package org.exercise.counter.exercisecounter.web.rest.user;

import jakarta.transaction.Transactional;
import org.exercise.counter.exercisecounter.web.data.register.Register;
import org.exercise.counter.exercisecounter.web.data.register.RegisterRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.user.dto.RegisterDto;
import org.exercise.counter.exercisecounter.web.rest.user.dto.UserDto;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;
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
    public UserDto user(Authentication authenticator) {
        if (authenticator != null) {
            UserDetails user = (UserDetails) authenticator.getPrincipal();
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

    @PostMapping("api/user/getInviteLink")
    @Transactional
    public String getInviteLink(@RequestBody String baseUrl, Authentication authenticator) {
        UserDetails principal = (UserDetails) authenticator.getPrincipal();
        List<Register> byIssuer = registerRepository.findByIssuer(principal.getUsername());
        if (byIssuer.size() > 10) {
            byIssuer.getFirst();
            return baseUrl + "/register/" + byIssuer.getFirst().getRegisterId();
        }
        Register reg = registerRepository.save(new Register(null, principal.getUsername()));
        return baseUrl + "/register/" + reg.getRegisterId();
    }

    @PostMapping("api/public/isInviteLinkValid")
    public Boolean validateInviteLink(@RequestBody String registerId) {
        return registerRepository.findById(UUID.fromString(registerId)).isPresent();
    }
}
