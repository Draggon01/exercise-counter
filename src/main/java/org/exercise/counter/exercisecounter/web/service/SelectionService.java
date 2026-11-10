package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Which exercises a user has on their home page and in which order.
 */
@Service
public class SelectionService {

    private final UserSelectionRepository userSelectionRepository;

    public SelectionService(UserSelectionRepository userSelectionRepository) {
        this.userSelectionRepository = userSelectionRepository;
    }

    /** Adds the exercise to the end of the user's list. */
    @Transactional
    public void select(UUID exerciseId, String username) {
        int nextPosition = userSelectionRepository.findMaxPositionByUsername(username)
                .map(max -> max + 1)
                .orElse(0);
        userSelectionRepository.save(new UserSelection(new UserSelectionId(username, exerciseId), nextPosition));
    }

    /** Removes the exercise from the user's list and closes the gap in the positions. */
    @Transactional
    public void unselect(UUID exerciseId, String username) {
        userSelectionRepository.deleteById(new UserSelectionId(username, exerciseId));
        compactPositions(username);
    }

    /** Sets the positions to the order of the given ids; ids the user has not selected are ignored. */
    @Transactional
    public void reorder(List<UUID> exerciseIds, String username) {
        for (int position = 0; position < exerciseIds.size(); position++) {
            int newPosition = position;
            userSelectionRepository.findById(new UserSelectionId(username, exerciseIds.get(position)))
                    .ifPresent(selection -> {
                        selection.setPosition(newPosition);
                        userSelectionRepository.save(selection);
                    });
        }
    }

    private void compactPositions(String username) {
        List<UserSelection> selections = userSelectionRepository.findByUserSelectionId_UsernameOrderByPositionAsc(username);
        for (int position = 0; position < selections.size(); position++) {
            UserSelection selection = selections.get(position);
            if (!Integer.valueOf(position).equals(selection.getPosition())) {
                selection.setPosition(position);
                userSelectionRepository.save(selection);
            }
        }
    }
}
