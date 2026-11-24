package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.groups.ExerciseGroupMappingRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.error.ForbiddenException;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Who may see or change a single exercise. An exercise the user may not see is answered like one that does not
 * exist (404), so ids cannot be probed.
 */
@Service
public class ExerciseAccess {

    private final ExerciseRepository exerciseRepository;
    private final ExerciseGroupMappingRepository exerciseGroupMappingRepository;
    private final UserSelectionRepository userSelectionRepository;

    public ExerciseAccess(ExerciseRepository exerciseRepository,
                          ExerciseGroupMappingRepository exerciseGroupMappingRepository,
                          UserSelectionRepository userSelectionRepository) {
        this.exerciseRepository = exerciseRepository;
        this.exerciseGroupMappingRepository = exerciseGroupMappingRepository;
        this.userSelectionRepository = userSelectionRepository;
    }

    /** Shared with the user, or still on their home list (also if it was made private later). */
    @Transactional(readOnly = true)
    public Exercise requireVisible(UUID exerciseId, String username) {
        Exercise exercise = find(exerciseId);
        if (isSharedWith(exercise, username)
                || userSelectionRepository.existsById(new UserSelectionId(username, exerciseId))) {
            return exercise;
        }
        throw notFound();
    }

    /**
     * Shared with the user right now. Needed to add it to the home list: being on the list grants access
     * ({@link #requireVisible}), so it must not be possible to just put any exercise there.
     */
    @Transactional(readOnly = true)
    public Exercise requireShared(UUID exerciseId, String username) {
        Exercise exercise = find(exerciseId);
        if (!isSharedWith(exercise, username)) {
            throw notFound();
        }
        return exercise;
    }

    /** Only the creator may change an exercise: 404 if the user cannot even see it, otherwise 403. */
    @Transactional(readOnly = true)
    public Exercise requireCreator(UUID exerciseId, String username) {
        Exercise exercise = requireVisible(exerciseId, username);
        if (!username.equals(exercise.getCreator())) {
            throw new ForbiddenException(username + " is not the creator of exercise " + exerciseId);
        }
        return exercise;
    }

    private boolean isSharedWith(Exercise exercise, String username) {
        return username.equals(exercise.getCreator())
                || exercise.getVisibility() == Visibility.PUBLIC
                || exercise.getVisibility() == Visibility.GROUPS
                && exerciseGroupMappingRepository.isSharedWithMember(exercise.getExerciseId(), username);
    }

    private Exercise find(UUID exerciseId) {
        return exerciseRepository.findById(exerciseId).orElseThrow(ExerciseAccess::notFound);
    }

    private static NotFoundException notFound() {
        return new NotFoundException("Exercise not found");
    }
}
