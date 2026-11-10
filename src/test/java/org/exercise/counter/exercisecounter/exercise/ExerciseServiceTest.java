package org.exercise.counter.exercisecounter.exercise;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.groups.*;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.rest.error.ForbiddenException;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.exercise.counter.exercisecounter.web.service.ExerciseService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ExerciseServiceTest {

    private static final String ALICE = "svc-alice";   // creator, member of the group
    private static final String BOB = "svc-bob";       // member of the group
    private static final String CAROL = "svc-carol";   // only invited to the group
    private static final String GROUP = "svc-group";

    @Autowired private ExerciseService exerciseService;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private GroupRepository groupRepository;
    @Autowired private UserGroupMappingRepository userGroupMappingRepository;
    @Autowired private ExerciseGroupMappingRepository exerciseGroupMappingRepository;
    @Autowired private UserSelectionRepository userSelectionRepository;

    private Exercise publicEx;
    private Exercise privateEx;
    private Exercise groupEx;
    private Group group;

    @BeforeEach
    void setup() {
        for (String name : List.of(ALICE, BOB, CAROL)) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}x"));
            }
        }
        group = new Group();
        group.setGroupName(GROUP);
        group.setVisibility(GroupVisibility.INVITE_ONLY);
        group = groupRepository.save(group);
        userGroupMappingRepository.save(new UserGroupMapping(ALICE, group.getGroupId()));
        userGroupMappingRepository.save(new UserGroupMapping(BOB, group.getGroupId()));
        UserGroupMapping invite = new UserGroupMapping(CAROL, group.getGroupId());
        invite.setIsInvited(true);
        userGroupMappingRepository.save(invite);

        publicEx = exercise("public", Visibility.PUBLIC);
        privateEx = exercise("private", Visibility.PRIVATE);
        groupEx = exercise("group", Visibility.GROUPS);
        exerciseGroupMappingRepository.save(new ExerciseGroupMapping(
                new ExerciseGroupMappingId(groupEx.getExerciseId(), group.getGroupId()), group));
    }

    @AfterEach
    void cleanup() {
        exerciseRepository.deleteAll(List.of(publicEx, privateEx, groupEx)); // cascades mappings + selections
        groupRepository.delete(group);                                       // cascades user mappings
    }

    @Test
    void creatorSeesEverything() {
        assertEquals(Set.of("public", "private", "group"), titles(exerciseService.listVisible(ALICE)));
    }

    @Test
    void groupMemberSeesPublicAndGroup_butNotOthersPrivate() {
        assertEquals(Set.of("public", "group"), titles(exerciseService.listVisible(BOB)));
    }

    @Test
    void pendingInvitationDoesNotGrantGroupAccess() {
        assertEquals(Set.of("public"), titles(exerciseService.listVisible(CAROL)));
    }

    @Test
    void available_excludesAlreadySelected() {
        userSelectionRepository.save(new UserSelection(new UserSelectionId(BOB, publicEx.getExerciseId()), 0));

        assertEquals(Set.of("group"), titles(exerciseService.listAvailable(BOB)));
        assertEquals(Set.of("public"), titles(exerciseService.listSelected(BOB)));
    }

    @Test
    void create_withoutPosition_addsToTheEndOfTheList() {
        userSelectionRepository.save(new UserSelection(new UserSelectionId(ALICE, publicEx.getExerciseId()), 0));
        ExerciseDto request = new ExerciseDto(null, "new one", ALICE, 1, "12:00:00", 0,
                ExerciseType.NUMBERREPEAT, "5", null, Visibility.PRIVATE, List.of(), null, null);

        ExerciseDto created = exerciseService.save(request, ALICE);

        assertEquals(1, created.position());
        exerciseRepository.deleteById(created.exerciseId());
    }

    @Test
    void edit_keepsTheExistingPosition() {
        userSelectionRepository.save(new UserSelection(new UserSelectionId(ALICE, publicEx.getExerciseId()), 4));
        ExerciseDto edit = new ExerciseDto(publicEx.getExerciseId(), "renamed", ALICE, 1, "12:00:00", 0,
                ExerciseType.NUMBERREPEAT, "1", null, Visibility.PUBLIC, List.of(), 0L, 99);

        assertEquals(4, exerciseService.save(edit, ALICE).position());
    }

    @Test
    void onlyCreatorCanDelete() {
        assertThrows(ForbiddenException.class, () -> exerciseService.delete(privateEx.getExerciseId(), BOB));
        assertTrue(exerciseRepository.existsById(privateEx.getExerciseId()));
    }

    @Test
    void onlyCreatorCanEdit() {
        ExerciseDto edit = new ExerciseDto(publicEx.getExerciseId(), "hijacked", BOB, 1, "12:00:00", 0,
                ExerciseType.NUMBERREPEAT, "1", null, Visibility.PUBLIC, List.of(), 0L, 0);

        assertThrows(ForbiddenException.class, () -> exerciseService.save(edit, BOB));
        assertEquals("public", exerciseRepository.findById(publicEx.getExerciseId()).orElseThrow().getExerciseTitle());
    }

    private Exercise exercise(String title, Visibility visibility) {
        Exercise e = new Exercise();
        e.setExerciseTitle(title);
        e.setCreator(ALICE);
        e.setDaysRepeat(1);
        e.setStartTime(LocalTime.NOON);
        e.setUtcOffset(0);
        e.setExerciseType(ExerciseType.NUMBERREPEAT);
        e.setExerciseValue("1");
        e.setVisibility(visibility);
        return exerciseRepository.save(e);
    }

    private static Set<String> titles(List<ExerciseDto> list) {
        return list.stream().map(ExerciseDto::exerciseTitle)
                .filter(t -> Set.of("public", "private", "group").contains(t))
                .collect(Collectors.toSet());
    }
}
