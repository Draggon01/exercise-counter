package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.groups.GroupMemberCount;
import org.exercise.counter.exercisecounter.web.data.groups.GroupRepository;
import org.exercise.counter.exercisecounter.web.data.groups.UserGroupMapping;
import org.exercise.counter.exercisecounter.web.data.groups.UserGroupMappingRepository;
import org.exercise.counter.exercisecounter.web.data.log.ExerciseLogRepository;
import org.exercise.counter.exercisecounter.web.data.options.UserOptionsRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodFinisher;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.scheduler.SchedulerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Deletes an account with everything that belongs to it.
 * <ul>
 *     <li>Exercises the user created and others use (home list, finished periods, today's check or progress) go to
 *     the most active of those users ({@link #heir}); exercises only the user used are deleted.</li>
 *     <li>Groups: the user leaves them; groups without a member left are deleted.</li>
 *     <li>Checks, progress, options and the user row; the database cascades the rest (home list, finished periods,
 *     invite links, push devices and reminders, password reset links).</li>
 * </ul>
 * {@code users.issuer} of people the user invited keeps the name on purpose (see its migration).
 */
@Service
public class AccountDeletionService {

    private static final Logger log = LoggerFactory.getLogger(AccountDeletionService.class);

    private final AccountService accountService;
    private final UserRepository userRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserSelectionRepository selectionRepository;
    private final FinishedUserRepository finishedUserRepository;
    private final CheckRepository checkRepository;
    private final ExerciseLogRepository logRepository;
    private final UserGroupMappingRepository memberRepository;
    private final GroupRepository groupRepository;
    private final UserOptionsRepository optionsRepository;
    private final SchedulerService schedulerService;

    public AccountDeletionService(AccountService accountService, UserRepository userRepository,
                                  ExerciseRepository exerciseRepository, UserSelectionRepository selectionRepository,
                                  FinishedUserRepository finishedUserRepository, CheckRepository checkRepository,
                                  ExerciseLogRepository logRepository, UserGroupMappingRepository memberRepository,
                                  GroupRepository groupRepository, UserOptionsRepository optionsRepository,
                                  SchedulerService schedulerService) {
        this.accountService = accountService;
        this.userRepository = userRepository;
        this.exerciseRepository = exerciseRepository;
        this.selectionRepository = selectionRepository;
        this.finishedUserRepository = finishedUserRepository;
        this.checkRepository = checkRepository;
        this.logRepository = logRepository;
        this.memberRepository = memberRepository;
        this.groupRepository = groupRepository;
        this.optionsRepository = optionsRepository;
        this.schedulerService = schedulerService;
    }

    /** What happened to the exercises the user created. */
    public record Result(Map<UUID, String> handedOver, List<UUID> deleted) {
    }

    /** Deletes the account after checking the password (400 if wrong). */
    @Transactional
    public Result deleteAccount(String username, String password) {
        User user = accountService.requirePassword(username, password);
        Result result = handOverOrDeleteExercises(username);
        leaveGroups(username);
        checkRepository.deleteByUsername(username);
        logRepository.deleteByUsername(username);
        optionsRepository.deleteById(username);
        userRepository.delete(user);
        log.info("Deleted account {} ({} exercise(s) handed over, {} deleted)",
                username, result.handedOver().size(), result.deleted().size());
        return result;
    }

    private Result handOverOrDeleteExercises(String username) {
        List<Exercise> own = exerciseRepository.findByCreator(username);
        if (own.isEmpty()) {
            return new Result(Map.of(), List.of());
        }
        List<UUID> ids = own.stream().map(Exercise::getExerciseId).toList();
        // one query per kind of use, for all exercises at once
        Map<UUID, Map<String, Long>> finished = finishedUserRepository.findFinishersByExerciseIds(ids).stream()
                .collect(Collectors.groupingBy(PeriodFinisher::exerciseId,
                        Collectors.groupingBy(PeriodFinisher::username, Collectors.counting())));
        // (ids only: no loaded rows that would point to exercises deleted below)
        Map<UUID, Set<String>> onHomeList = usersBy(selectionRepository.findIdsByExerciseIdIn(ids),
                UserSelectionId::getExerciseId, UserSelectionId::getUsername);
        Map<UUID, Set<String>> checked = usersBy(checkRepository.findIdsByExerciseIdIn(ids),
                CheckId::getExerciseId, CheckId::getUsername);
        Map<UUID, Set<String>> progress = usersBy(logRepository.findIdsByExerciseIdIn(ids),
                ExerciseLogId::getExerciseId, ExerciseLogId::getUsername);

        Map<UUID, String> handedOver = new LinkedHashMap<>();
        List<UUID> deleted = new ArrayList<>();
        for (Exercise exercise : own) {
            UUID id = exercise.getExerciseId();
            Optional<String> heir = heir(username,
                    finished.getOrDefault(id, Map.of()),
                    onHomeList.getOrDefault(id, Set.of()),
                    union(checked.getOrDefault(id, Set.of()), progress.getOrDefault(id, Set.of())));
            if (heir.isPresent()) {
                exercise.setCreator(heir.get());
                exerciseRepository.save(exercise);
                handedOver.put(id, heir.get());
            } else {
                logRepository.deleteByExerciseId(id);
                exerciseRepository.delete(exercise); // cascades home lists, checks, periods, groups, reminders
                deleted.add(id);
            }
        }
        if (!deleted.isEmpty()) {
            afterCommit(() -> deleted.forEach(schedulerService::cancelSchedulerFor));
        }
        return new Result(handedOver, deleted);
    }

    /**
     * The new owner of an exercise: the other user who finished it most often; on a tie the one who still has it
     * on the home list, then by name. Users who only have it on the home list or only started it today count too.
     * Empty if nobody else used it.
     */
    public static Optional<String> heir(String leaving, Map<String, Long> finishedPeriods, Set<String> onHomeList,
                                 Set<String> otherUse) {
        return Stream.of(finishedPeriods.keySet(), onHomeList, otherUse)
                .flatMap(Collection::stream)
                .filter(user -> !user.equals(leaving))
                .distinct()
                .min(Comparator.<String>comparingLong(user -> -finishedPeriods.getOrDefault(user, 0L))
                        .thenComparing(user -> !onHomeList.contains(user))
                        .thenComparing(Comparator.naturalOrder()));
    }

    /** Leaves all groups; a group nobody is in any more (invitations do not count) is deleted. */
    private void leaveGroups(String username) {
        List<UserGroupMapping> memberships = memberRepository.findByUserGroupMappingId_Username(username);
        if (!memberships.isEmpty()) {
            memberRepository.deleteAll(memberships);
            memberRepository.flush();
            Set<UUID> groupIds = memberships.stream()
                    .map(m -> m.getUserGroupMappingId().getGroupId())
                    .collect(Collectors.toSet());
            Set<UUID> stillUsed = memberRepository.countMembers(groupIds).stream()
                    .filter(count -> count.members() > 0)
                    .map(GroupMemberCount::groupId)
                    .collect(Collectors.toSet());
            groupIds.stream().filter(id -> !stillUsed.contains(id)).forEach(groupRepository::deleteById);
        }
        groupRepository.clearCreator(username);
    }

    private static <T> Map<UUID, Set<String>> usersBy(List<T> rows, Function<T, UUID> exercise, Function<T, String> user) {
        return rows.stream().collect(Collectors.groupingBy(exercise, Collectors.mapping(user, Collectors.toSet())));
    }

    private static Set<String> union(Set<String> a, Set<String> b) {
        Set<String> all = new HashSet<>(a);
        all.addAll(b);
        return all;
    }

    /** The schedulers stop only when the deletion is saved (a rollback keeps the exercises running). */
    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
