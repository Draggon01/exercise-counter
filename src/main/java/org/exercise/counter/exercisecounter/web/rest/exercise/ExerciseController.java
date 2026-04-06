package org.exercise.counter.exercisecounter.web.rest.exercise;

import jakarta.transaction.Transactional;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibiltiy;
import org.exercise.counter.exercisecounter.web.data.groups.*;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.CheckDto;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ExerciseController {

    private final ExerciseRepository exerciseRepository;
    private final CheckRepository checkRepository;
    private final SchedulerService schedulerService;
    private final ExerciseGroupMappingRepository exerciseGroupMappingRepository;
    private final UserGroupMappingRepository userGroupMappingRepository;
    private final UserSelectionRepository userSelectionRepository;
    private final PeriodRepository periodRepository;
    private final FinishedUserRepository finishedUserRepository;


    public ExerciseController(
            ExerciseRepository exerciseRepository,
            CheckRepository checkRepository,
            SchedulerService schedulerService,
            ExerciseGroupMappingRepository exerciseGroupMappingRepository,
            UserGroupMappingRepository userGroupMappingRepository,
            UserSelectionRepository userSelectionRepository, PeriodRepository periodRepository, FinishedUserRepository finishedUserRepository) {
        this.exerciseRepository = exerciseRepository;
        this.checkRepository = checkRepository;
        this.schedulerService = schedulerService;
        this.exerciseGroupMappingRepository = exerciseGroupMappingRepository;
        this.userGroupMappingRepository = userGroupMappingRepository;
        this.userSelectionRepository = userSelectionRepository;
        this.periodRepository = periodRepository;
        this.finishedUserRepository = finishedUserRepository;
    }

    @GetMapping("/exercises/list")
    public List<ExerciseDto> getAllExercises() {
        return exerciseRepository.findAll().stream()
                .map(exercise -> new ExerciseDto(
                        exercise.getExerciseId(),
                        exercise.getExerciseTitle(),
                        exercise.getCreator(),
                        exercise.getDaysRepeat(),
                        exercise.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                        exercise.getUtcOffset(),
                        exercise.getExerciseType(),
                        exercise.getExerciseValue(),
                        exercise.getExerciseIncrease(),
                        exercise.getVisibility(),
                        this.GroupsForExercise(exercise.getExerciseId()),
                        this.calculateTimeLeftSeconds(exercise),
                        null
                ))
                .toList();
    }


    @GetMapping("/exercises/list/selected")
    public List<ExerciseDto> getAllExercisesForUser(Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        return userSelectionRepository.findByUserSelectionId_UsernameOrderByPositionAsc(username)
                .stream()
                .map(selection -> new ExerciseDto(
                        selection.getExercise().getExerciseId(),
                        selection.getExercise().getExerciseTitle(),
                        selection.getExercise().getCreator(),
                        selection.getExercise().getDaysRepeat(),
                        selection.getExercise().getStartTime().format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                        selection.getExercise().getUtcOffset(),
                        selection.getExercise().getExerciseType(),
                        selection.getExercise().getExerciseValue(),
                        selection.getExercise().getExerciseIncrease(),
                        selection.getExercise().getVisibility(),
                        this.GroupsForExercise(selection.getExercise().getExerciseId()),
                        this.calculateTimeLeftSeconds(selection.getExercise()),
                        selection.getPosition()
                )).toList();
    }

    @GetMapping("/exercises/list/available")
    public List<ExerciseDto> getAllExercisesAvailableForUser(Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();

        //get groups from user
        List<String> groups = userGroupMappingRepository.findByUserGroupMappingId_Username(username)
                .stream()
                .filter(groupMapping -> !groupMapping.getIsInvited())
                .map(groupMapping -> groupMapping.getGroup().getGroupName())
                .toList();

        List<UUID> alreadySelectedExercises = userSelectionRepository.findByUserSelectionId_Username(username)
                .stream()
                .map(selection -> selection.getExercise().getExerciseId())
                .toList();

        return exerciseRepository.findAll()
                .stream()
                .filter(exercise -> !alreadySelectedExercises.contains(exercise.getExerciseId()))
                .filter(exercise -> switch (exercise.getVisibility()) {
                    case Visibiltiy.PUBLIC -> true;
                    case Visibiltiy.PRIVATE -> exercise.getCreator().equals(username);
                    case Visibiltiy.GROUPS ->
                            exerciseGroupMappingRepository.findByExerciseGroupMappingId_ExerciseId(exercise.getExerciseId())
                                    .stream()
                                    .map(groupMapping -> groupMapping.getGroup().getGroupName())
                                    .anyMatch(groups::contains);
                })
                .map(exercise -> new ExerciseDto(
                        exercise.getExerciseId(),
                        exercise.getExerciseTitle(),
                        exercise.getCreator(),
                        exercise.getDaysRepeat(),
                        exercise.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                        exercise.getUtcOffset(),
                        exercise.getExerciseType(),
                        exercise.getExerciseValue(),
                        exercise.getExerciseIncrease(),
                        exercise.getVisibility(),
                        this.GroupsForExercise(exercise.getExerciseId()),
                        this.calculateTimeLeftSeconds(exercise),
                        this.getSorting(exercise, username)
                )).toList();
    }

    private Integer getSorting(Exercise exercise, String username) {
        Optional<UserSelection> byId = userSelectionRepository
                .findById(new UserSelectionId(username, exercise.getExerciseId()));
        return byId.map(UserSelection::getPosition).orElse(null);
    }

    private long calculateTimeLeftSeconds(Exercise exercise) {
        return schedulerService.getTimeLeftSeconds(exercise.getExerciseId());
    }

    private List<String> GroupsForExercise(UUID exerciseId) {
        return exerciseGroupMappingRepository.findByExerciseGroupMappingId_ExerciseId(exerciseId)
                .stream()
                .map(mapping -> mapping.getGroup().getGroupName())
                .toList();
    }

    @PostMapping("/exercises/save")
    @Transactional
    public ExerciseDto addExercise(@RequestBody ExerciseDto exercise, Authentication authentication) {
        checkExerciseAuthority(exercise.exerciseId(), authentication);
        Exercise save = exerciseRepository.save(
                new Exercise(
                        exercise.exerciseId(),
                        exercise.exerciseTitle(),
                        exercise.creator(),
                        exercise.daysRepeat(),
                        LocalTime.parse(exercise.startTime(),
                                DateTimeFormatter.ofPattern("HH:mm:ss")),
                        exercise.utcOffset(),
                        exercise.exerciseType(),
                        exercise.exerciseValue(),
                        exercise.exerciseIncrease(),
                        exercise.visibility(),
                        null));

        exerciseGroupMappingRepository.deleteAll(exerciseGroupMappingRepository.findByExerciseGroupMappingId_ExerciseId(save.getExerciseId()));
        List<UserGroupMapping> byUserGroupMappingIdUsername =
                userGroupMappingRepository.findByUserGroupMappingId_Username(((UserDetails) authentication.getPrincipal()).getUsername());
        for (String group : exercise.groups()) {
            byUserGroupMappingIdUsername
                    .stream()
                    .filter(mapping -> mapping.getGroup().getGroupName().equals(group))
                    .findFirst()
                    .ifPresent(mapping -> exerciseGroupMappingRepository.save(
                            new ExerciseGroupMapping(new ExerciseGroupMappingId(save.getExerciseId(), mapping.getGroup().getGroupId()), mapping.getGroup())
                    ));
        }

        //add exercise to user, as it should be there if one is created
        userSelectionRepository.save(
                new UserSelection(
                        new UserSelectionId(
                                ((UserDetails) authentication.getPrincipal()).getUsername(),
                                save.getExerciseId())
                )
        );
        schedulerService.restartSchedulerFor(save);
        return new ExerciseDto(
                save.getExerciseId(),
                save.getExerciseTitle(),
                save.getCreator(),
                save.getDaysRepeat(),
                save.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm:ss")),
                save.getUtcOffset(),
                save.getExerciseType(),
                save.getExerciseValue(),
                save.getExerciseIncrease(),
                save.getVisibility(),
                this.GroupsForExercise(save.getExerciseId()),
                this.calculateTimeLeftSeconds(save),
                null
        );
    }

    @PostMapping("/exercises/delete")
    public ExerciseDto deleteExercise(@RequestBody ExerciseDto exerciseToDelete, Authentication authentication) {
        UUID exerciseId = exerciseToDelete.exerciseId();
        checkExerciseAuthority(exerciseId, authentication);
        exerciseRepository.deleteById(exerciseId);
        return exerciseToDelete;
    }

    private void checkExerciseAuthority(UUID exerciseId, Authentication authentication) {
        if (exerciseId == null) {
            return;
        }
        exerciseRepository.findById(exerciseId)
                .ifPresent(ex -> {
                    String username = ((UserDetails) authentication.getPrincipal()).getUsername();
                    if (!username.equals(ex.getCreator())) {
                        throw new RuntimeException(username + " tried to edit/delete exercise " + ex.getExerciseId() + " which he did not create!");
                    }
                });
    }

    @GetMapping("/check/list")
    public List<CheckDto> getAllChecksForUser(Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();
        return checkRepository.findCheckByCheckIdUsername(username).stream().map(
                check -> new CheckDto(check.getCheckId().getExerciseId(), username, -1)
        ).toList();
    }

    @GetMapping("/check/list/per/exercise")
    public Map<UUID, List<CheckDto>> getAllChecksPerExercise() {
        return exerciseRepository.findAll().stream().collect(Collectors.toMap(Exercise::getExerciseId,
                ex -> checkRepository.findCheckByCheckIdExerciseId(ex.getExerciseId())
                        .stream()
                        .map(check ->
                                new CheckDto(check.getCheckId().getExerciseId(),
                                        check.getCheckId().getUsername(), getStreak(check)))
                        .toList()
        ));
    }

    private Integer getStreak(Check check) {
        List<Period> periods = periodRepository.findByExerciseExerciseId(check.getCheckId().getExerciseId());
        List<Period> sortedPeriods = periods.stream()
                .sorted((p1, p2) -> p2.getTimeRange().lower().compareTo(p1.getTimeRange().lower()))
                .toList();

        int streak = 1; // 1 to add the one from checked if it is shown
        for (Period period : sortedPeriods) {
            boolean finished = finishedUserRepository.findByPeriod_PeriodId(period.getPeriodId())
                    .stream()
                    .anyMatch(fu -> fu.getUsername().getUsername().equals(check.getCheckId().getUsername()));

            if (finished) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    @PostMapping("/check/save")
    public CheckDto addCheckForExercise(@RequestBody CheckDto checkDto, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();
        Check check = new Check(new CheckId(checkDto.exerciseId(), username));
        checkRepository.save(check);
        return checkDto;
    }

    @PostMapping("/check/delete")
    public CheckDto removeCheckForExercise(@RequestBody CheckDto checkDto, Authentication authentication) {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String username = user.getUsername();
        CheckId checkId = new CheckId(checkDto.exerciseId(), username);
        checkRepository.deleteById(checkId);
        return checkDto;
    }

    @GetMapping("/exercises/exercisetype")
    public Map<String, String> getExerciseTypes() {
        return ExerciseType.getAllDescriptionsAsMap();
    }

    @GetMapping("/exercises/visibility")
    public List<String> getExerciseVisibilities() {
        return Arrays.stream(Visibiltiy.values()).map(Enum::toString).toList();
    }
}
