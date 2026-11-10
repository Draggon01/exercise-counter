package org.exercise.counter.exercisecounter.performance;

import io.hypersistence.utils.hibernate.type.range.Range;
import jakarta.persistence.EntityManagerFactory;
import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.checks.Check;
import org.exercise.counter.exercisecounter.web.data.checks.CheckId;
import org.exercise.counter.exercisecounter.web.data.checks.CheckRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.data.groups.*;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUser;
import org.exercise.counter.exercisecounter.web.data.statistic.FinishedUserRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.Period;
import org.exercise.counter.exercisecounter.web.data.statistic.PeriodRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelection;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionId;
import org.exercise.counter.exercisecounter.web.data.userselection.UserSelectionRepository;
import org.exercise.counter.exercisecounter.web.service.CheckService;
import org.exercise.counter.exercisecounter.web.service.ExerciseService;
import org.exercise.counter.exercisecounter.web.service.GroupService;
import org.exercise.counter.exercisecounter.web.service.StatisticService;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The number of SQL statements of the main read paths must not grow with the amount of data (no N+1).
 * Each scenario runs with a small and a larger data set and compares the statement counts.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@Import(TestcontainersConfiguration.class)
class QueryCountTest {

    private static final String USER = "qc-user";
    private static final String OTHER = "qc-other";

    @Autowired private EntityManagerFactory entityManagerFactory;
    @Autowired private ExerciseService exerciseService;
    @Autowired private CheckService checkService;
    @Autowired private StatisticService statisticService;
    @Autowired private GroupService groupService;
    @Autowired private ExerciseRepository exerciseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private UserSelectionRepository userSelectionRepository;
    @Autowired private CheckRepository checkRepository;
    @Autowired private PeriodRepository periodRepository;
    @Autowired private FinishedUserRepository finishedUserRepository;
    @Autowired private GroupRepository groupRepository;
    @Autowired private UserGroupMappingRepository userGroupMappingRepository;
    @Autowired private ExerciseGroupMappingRepository exerciseGroupMappingRepository;

    private final List<Exercise> created = new ArrayList<>();
    private final List<Group> groups = new ArrayList<>();

    @BeforeEach
    void users() {
        for (String name : List.of(USER, OTHER)) {
            if (userRepository.findByUsername(name).isEmpty()) {
                userRepository.save(new User(name, "{noop}x"));
            }
        }
    }

    @AfterEach
    void cleanup() {
        exerciseRepository.deleteAll(created); // cascades periods, finishers, checks, selections, mappings
        groupRepository.deleteAll(groups);
        created.clear();
        groups.clear();
    }

    @Test
    void homePageAndBrowse_constantQueries() {
        long small = measure(2, () -> {
            exerciseService.listSelected(USER);
            exerciseService.listAvailable(USER);
            exerciseService.listVisible(USER);
        });
        long large = measure(6, () -> {
            exerciseService.listSelected(USER);
            exerciseService.listAvailable(USER);
            exerciseService.listVisible(USER);
        });
        assertEquals(small, large, "exercise lists must not issue one query per exercise");
    }

    @Test
    void checksWithStreaks_constantQueries() {
        long small = measure(2, () -> checkService.listPerSelectedExercise(USER));
        long large = measure(6, () -> checkService.listPerSelectedExercise(USER));
        assertEquals(small, large, "streaks must not issue queries per exercise, check or period");
    }

    @Test
    void statistics_constantQueries() {
        long small = measure(2, () -> {
            statisticService.load(created.getFirst().getExerciseId());
            statisticService.unfinishedPeriods(created.getFirst().getExerciseId(), USER);
        });
        long large = measure(6, () -> {
            statisticService.load(created.getFirst().getExerciseId());
            statisticService.unfinishedPeriods(created.getFirst().getExerciseId(), USER);
        });
        assertEquals(small, large, "statistics must not issue one query per period");
    }

    @Test
    void groups_constantQueries() {
        long small = measure(2, () -> {
            groupService.userGroups(USER);
            groupService.listExerciseGroups(USER);
        });
        long large = measure(6, () -> {
            groupService.userGroups(USER);
            groupService.listExerciseGroups(USER);
        });
        assertEquals(small, large, "group lists must not issue one query per group or mapping");
    }

    /** Creates {@code n} exercises (with groups, selections, checks, periods) and counts the statements of {@code action}. */
    private long measure(int n, Runnable action) {
        cleanup();
        seed(n);
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        action.run();
        return statistics.getPrepareStatementCount();
    }

    private void seed(int n) {
        LocalDateTime base = LocalDateTime.now(); // one base so neighbouring periods never overlap
        for (int i = 0; i < n; i++) {
            Group group = new Group();
            group.setGroupName("qc-group-" + i);
            group.setVisibility(GroupVisibility.INVITE_ONLY);
            group = groupRepository.save(group);
            groups.add(group);
            userGroupMappingRepository.save(new UserGroupMapping(USER, group.getGroupId()));

            Exercise selected = exercise("qc-selected-" + i, Visibility.GROUPS);
            Exercise browsable = exercise("qc-browse-" + i, Visibility.GROUPS);
            for (Exercise e : List.of(selected, browsable)) {
                exerciseGroupMappingRepository.save(new ExerciseGroupMapping(
                        new ExerciseGroupMappingId(e.getExerciseId(), group.getGroupId()), group));
            }
            userSelectionRepository.save(new UserSelection(new UserSelectionId(USER, selected.getExerciseId()), i));
            checkRepository.save(new Check(new CheckId(selected.getExerciseId(), USER)));
            checkRepository.save(new Check(new CheckId(selected.getExerciseId(), OTHER)));

            // n periods on the first exercise, one on the others
            Exercise periodTarget = created.getFirst();
            LocalDateTime end = base.minusDays(i + 1);
            Period period = new Period();
            period.setExercise(periodTarget);
            period.setTimeRange(Range.openClosed(end.minusDays(1), end));
            period = periodRepository.save(period);
            for (String username : List.of(USER, OTHER)) {
                FinishedUser fu = new FinishedUser();
                fu.setPeriod(period);
                fu.setUsername(userRepository.findByUsername(username).orElseThrow());
                finishedUserRepository.save(fu);
            }
        }
    }

    private Exercise exercise(String title, Visibility visibility) {
        Exercise e = new Exercise();
        e.setExerciseTitle(title);
        e.setCreator(OTHER);
        e.setDaysRepeat(1);
        e.setStartTime(LocalTime.NOON);
        e.setUtcOffset(0);
        e.setExerciseType(ExerciseType.NUMBERREPEAT);
        e.setExerciseValue("1");
        e.setVisibility(visibility);
        Exercise saved = exerciseRepository.save(e);
        created.add(saved);
        return saved;
    }
}
