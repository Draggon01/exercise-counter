package org.exercise.counter.exercisecounter.web.rest.userselection;

import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/selection/")
public class UserSelectionController {
    private final UserSelectionRepository userSelectionRepository;
    private final ExerciseRepository exerciseRepository;

    public UserSelectionController(UserSelectionRepository userSelectionRepository, ExerciseRepository exerciseRepository) {
        this.userSelectionRepository = userSelectionRepository;
        this.exerciseRepository = exerciseRepository;
    }

    @PostMapping("/select")
    public void select(@RequestBody String exerciseId, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        UserSelectionId userSelectionId = new UserSelectionId(username, UUID.fromString(exerciseId));
        UserSelection userSelection = new UserSelection(userSelectionId);
        userSelectionRepository.save(userSelection);
    }

    @PostMapping("/unselect")
    public void unselect(@RequestBody String exerciseId, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        UserSelectionId userSelectionId = new UserSelectionId(username, UUID.fromString(exerciseId));
        userSelectionRepository.deleteById(userSelectionId);
    }
}
