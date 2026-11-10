package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.groups.ExerciseGroupMapping;
import org.exercise.counter.exercisecounter.web.data.groups.ExerciseGroupMappingId;
import org.exercise.counter.exercisecounter.web.data.groups.ExerciseGroupMappingRepository;
import org.exercise.counter.exercisecounter.web.data.groups.UserGroupMapping;
import org.exercise.counter.exercisecounter.web.data.groups.UserGroupMappingRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.error.ForbiddenException;
import org.exercise.counter.exercisecounter.web.rest.exercise.ExerciseMapper;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Creating, editing, deleting and listing exercises, including who may see which exercise.
 */
@Service
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;
    private final ExerciseGroupMappingRepository exerciseGroupMappingRepository;
    private final UserGroupMappingRepository userGroupMappingRepository;
    private final UserSelectionRepository userSelectionRepository;
    private final SchedulerService schedulerService;

    public ExerciseService(ExerciseRepository exerciseRepository,
                           ExerciseGroupMappingRepository exerciseGroupMappingRepository,
                           UserGroupMappingRepository userGroupMappingRepository,
                           UserSelectionRepository userSelectionRepository,
                           SchedulerService schedulerService) {
        this.exerciseRepository = exerciseRepository;
        this.exerciseGroupMappingRepository = exerciseGroupMappingRepository;
        this.userGroupMappingRepository = userGroupMappingRepository;
        this.userSelectionRepository = userSelectionRepository;
        this.schedulerService = schedulerService;
    }

    /**
     * All exercises the user may see (public, own private ones, and those shared with their groups).
     */
    @Transactional(readOnly = true)
    public List<ExerciseDto> listVisible(String username) {
        Set<String> memberGroups = memberGroupNames(username);
        return exerciseRepository.findAll().stream()
                .filter(exercise -> isVisibleTo(exercise, username, memberGroups))
                .map(exercise -> toDto(exercise, null))
                .toList();
    }

    /**
     * The exercises on the user's home page, in their sort order.
     */
    @Transactional(readOnly = true)
    public List<ExerciseDto> listSelected(String username) {
        return userSelectionRepository.findByUserSelectionId_UsernameOrderByPositionAsc(username).stream()
                .map(selection -> toDto(selection.getExercise(), selection.getPosition()))
                .toList();
    }

    /**
     * Visible exercises the user has not added to their home page yet (browse view).
     */
    @Transactional(readOnly = true)
    public List<ExerciseDto> listAvailable(String username) {
        Set<String> memberGroups = memberGroupNames(username);
        Set<UUID> selected = userSelectionRepository.findByUserSelectionId_Username(username).stream()
                .map(selection -> selection.getUserSelectionId().getExerciseId())
                .collect(Collectors.toSet());
        return exerciseRepository.findAll().stream()
                .filter(exercise -> !selected.contains(exercise.getExerciseId()))
                .filter(exercise -> isVisibleTo(exercise, username, memberGroups))
                .map(exercise -> toDto(exercise, null))
                .toList();
    }

    /**
     * Creates or updates an exercise. The current user becomes (or must already be) the creator,
     * the exercise is added to their home page and its reset scheduler is restarted.
     */
    @Transactional
    public ExerciseDto save(ExerciseDto dto, String username) {
        requireCreator(dto.exerciseId(), username);
        Exercise saved = exerciseRepository.save(ExerciseMapper.toEntity(dto, username));
        UUID exerciseId = saved.getExerciseId();

        replaceGroupMappings(exerciseId, dto.groups(), username);
        userSelectionRepository.save(new UserSelection(new UserSelectionId(username, exerciseId), dto.position()));
        schedulerService.restartSchedulerFor(saved);
        return toDto(saved, dto.position());
    }

    /**
     * Deletes an exercise created by the user and stops its scheduler.
     */
    @Transactional
    public void delete(UUID exerciseId, String username) {
        requireCreator(exerciseId, username);
        exerciseRepository.deleteById(exerciseId);
        schedulerService.cancelSchedulerFor(exerciseId);
    }

    /**
     * Only the creator may change an existing exercise. New exercises ({@code null} id or unknown id) pass.
     */
    private void requireCreator(UUID exerciseId, String username) {
        if (exerciseId == null) {
            return;
        }
        exerciseRepository.findById(exerciseId).ifPresent(existing -> {
            if (!username.equals(existing.getCreator())) {
                throw new ForbiddenException(username + " is not the creator of exercise " + existing.getExerciseId());
            }
        });
    }

    /**
     * Shares the exercise with the given groups, ignoring groups the user is not a member of.
     */
    private void replaceGroupMappings(UUID exerciseId, List<String> groupNames, String username) {
        exerciseGroupMappingRepository.deleteAll(
                exerciseGroupMappingRepository.findByExerciseGroupMappingId_ExerciseId(exerciseId));
        if (groupNames == null) {
            return;
        }
        List<UserGroupMapping> memberships = userGroupMappingRepository.findByUserGroupMappingId_Username(username);
        for (String groupName : groupNames) {
            memberships.stream()
                    .filter(mapping -> mapping.getGroup().getGroupName().equals(groupName))
                    .findFirst()
                    .ifPresent(mapping -> exerciseGroupMappingRepository.save(new ExerciseGroupMapping(
                            new ExerciseGroupMappingId(exerciseId, mapping.getGroup().getGroupId()),
                            mapping.getGroup())));
        }
    }

    private boolean isVisibleTo(Exercise exercise, String username, Set<String> memberGroups) {
        return switch (exercise.getVisibility()) {
            case PUBLIC -> true;
            case PRIVATE -> username.equals(exercise.getCreator());
            case GROUPS -> groupNames(exercise.getExerciseId()).stream().anyMatch(memberGroups::contains);
        };
    }

    /** Names of the groups the user has joined (pending invitations do not count). */
    private Set<String> memberGroupNames(String username) {
        return userGroupMappingRepository.findByUserGroupMappingId_Username(username).stream()
                .filter(mapping -> !Boolean.TRUE.equals(mapping.getIsInvited()))
                .map(mapping -> mapping.getGroup().getGroupName())
                .collect(Collectors.toSet());
    }

    private List<String> groupNames(UUID exerciseId) {
        return exerciseGroupMappingRepository.findByExerciseGroupMappingId_ExerciseId(exerciseId).stream()
                .map(mapping -> mapping.getGroup().getGroupName())
                .toList();
    }

    private ExerciseDto toDto(Exercise exercise, Integer position) {
        return ExerciseMapper.toDto(exercise, groupNames(exercise.getExerciseId()),
                schedulerService.getTimeLeftSeconds(exercise.getExerciseId()), position);
    }
}
