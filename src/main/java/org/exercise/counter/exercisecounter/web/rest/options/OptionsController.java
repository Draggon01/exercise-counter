package org.exercise.counter.exercisecounter.web.rest.options;

import org.exercise.counter.exercisecounter.web.data.options.UserOptions;
import org.exercise.counter.exercisecounter.web.data.options.UserOptionsRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/options")
public class OptionsController {

    private final UserOptionsRepository userOptionsRepository;

    public OptionsController(UserOptionsRepository userOptionsRepository) {
        this.userOptionsRepository = userOptionsRepository;
    }

    public record OptionsDto(boolean autoCollapse) {}

    @GetMapping
    public OptionsDto getOptions(Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        UserOptions options = userOptionsRepository.findById(username)
                .orElseGet(() -> userOptionsRepository.save(new UserOptions(username, true)));
        return new OptionsDto(options.isAutoCollapse());
    }

    @PutMapping
    public OptionsDto saveOptions(@RequestBody OptionsDto dto, Authentication authentication) {
        String username = ((UserDetails) authentication.getPrincipal()).getUsername();
        UserOptions options = userOptionsRepository.findById(username)
                .orElse(new UserOptions(username, true));
        options.setAutoCollapse(dto.autoCollapse());
        userOptionsRepository.save(options);
        return new OptionsDto(options.isAutoCollapse());
    }
}
