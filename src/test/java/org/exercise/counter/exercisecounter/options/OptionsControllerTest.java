package org.exercise.counter.exercisecounter.options;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.options.UserOptions;
import org.exercise.counter.exercisecounter.web.data.options.UserOptionsRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.options.OptionsController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class OptionsControllerTest {

    @Autowired
    private OptionsController optionsController;

    @Autowired
    private UserOptionsRepository userOptionsRepository;

    @Autowired
    private UserRepository userRepository;

    private Authentication authentication;

    @BeforeEach
    void setup() {
        userOptionsRepository.deleteAll();
        userRepository.deleteAll();

        User user = new User("testuser", "{noop}password");
        userRepository.save(user);

        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                "testuser", "{noop}password", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }

    @Test
    void getOptions_createsDefaultsWhenAbsent() {
        var result = optionsController.getOptions(authentication);

        assertTrue(result.autoCollapse(), "Default autoCollapse should be true");
        assertTrue(userOptionsRepository.existsById("testuser"), "Row should have been persisted");
    }

    @Test
    void getOptions_returnsExistingOptions() {
        userOptionsRepository.save(new UserOptions("testuser", false));

        var result = optionsController.getOptions(authentication);

        assertFalse(result.autoCollapse());
    }

    @Test
    void saveOptions_persistsChange() {
        optionsController.saveOptions(new OptionsController.OptionsDto(false), authentication);

        UserOptions saved = userOptionsRepository.findById("testuser").orElseThrow();
        assertFalse(saved.isAutoCollapse());
    }

    @Test
    void saveOptions_returnsUpdatedValue() {
        var result = optionsController.saveOptions(new OptionsController.OptionsDto(false), authentication);

        assertFalse(result.autoCollapse());
    }
}
