package org.exercise.counter.exercisecounter.web.rest.userselection;

import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
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
    private final ExerciseRepository exerciseRepository;

    public UserSelectionController(UserSelectionRepository userSelectionRepository, ExerciseRepository exerciseRepository) {
        this.userSelectionRepository = userSelectionRepository;
        this.exerciseRepository = exerciseRepository;
    }

    @PostMapping("/select")
    public void select(@RequestBody String exerciseId, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        int nextOrder = userSelectionRepository.findMaxSortOrderByUsername(username)
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
        recompactSortOrder(username);
    }

    @PostMapping("/reorder")
    public void reorder(@RequestBody List<String> exerciseIds, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        for (int i = 0; i < exerciseIds.size(); i++) {
            final int position = i;
            UUID exerciseId = UUID.fromString(exerciseIds.get(i));
            UserSelectionId id = new UserSelectionId(username, exerciseId);
            userSelectionRepository.findById(id).ifPresent(sel -> {
                sel.setSortOrder(position);
                userSelectionRepository.save(sel);
            });
        }
    }

    private void recompactSortOrder(String username) {
        List<UserSelection> selections = userSelectionRepository
                .findByUserSelectionId_UsernameOrderBySortOrderAsc(username);
        for (int i = 0; i < selections.size(); i++) {
            UserSelection sel = selections.get(i);
            if (!sel.getSortOrder().equals(i)) {
                sel.setSortOrder(i);
                userSelectionRepository.save(sel);
            }
        }
    }
}
