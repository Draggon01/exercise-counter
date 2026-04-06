package org.exercise.counter.exercisecounter.web.rest.userselection;

import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.exercise.ExerciseController;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/selection/")
public class UserSelectionController {
    private final UserSelectionRepository userSelectionRepository;
    private final ExerciseController exerciseController;

    public UserSelectionController(UserSelectionRepository userSelectionRepository,
                                   ExerciseController exerciseController) {
        this.userSelectionRepository = userSelectionRepository;
        this.exerciseController = exerciseController;
    }

    @PostMapping("/select")
    public void select(@RequestBody String exerciseId, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        int nextOrder = userSelectionRepository.findMaxPositionByUsername(username)
                .map(max -> max + 1)
                .orElse(0);

        UserSelectionId userSelectionId = new UserSelectionId(username, UUID.fromString(exerciseId));
        userSelectionRepository.save(new UserSelection(userSelectionId, nextOrder));
    }

    @PostMapping("/unselect")
    public void unselect(@RequestBody String exerciseId, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        UserSelectionId userSelectionId = new UserSelectionId(username, UUID.fromString(exerciseId));
        userSelectionRepository.deleteById(userSelectionId);
        recompactPosition(username);
    }

    @PostMapping("/reorder")
    public List<ExerciseDto> reorder(@RequestBody List<String> exerciseIds, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        for (int i = 0; i < exerciseIds.size(); i++) {
            final int position = i;
            UUID exerciseId = UUID.fromString(exerciseIds.get(i));
            UserSelectionId id = new UserSelectionId(username, exerciseId);
            userSelectionRepository.findById(id).ifPresent(sel -> {
                sel.setPosition(position);
                userSelectionRepository.save(sel);
            });
        }
        return exerciseController.getAllExercisesForUser(authentication);
    }

    private void recompactPosition(String username) {
        List<UserSelection> selections = userSelectionRepository
                .findByUserSelectionId_UsernameOrderByPositionAsc(username);
        for (int i = 0; i < selections.size(); i++) {
            UserSelection sel = selections.get(i);
            if (!sel.getPosition().equals(i)) {
                sel.setPosition(i);
                userSelectionRepository.save(sel);
            }
        }
    }
}
