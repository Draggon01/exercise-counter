package org.exercise.counter.exercisecounter.changelog;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.exercise.counter.exercisecounter.web.data.options.UserOptions;
import org.exercise.counter.exercisecounter.web.data.options.UserOptionsRepository;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.changelog.dto.ChangelogEntry;
import org.exercise.counter.exercisecounter.web.service.ChangelogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ChangelogServiceTest {

    private static final String USER = "changelog-user";

    @Autowired private ChangelogService changelogService;
    @Autowired private UserOptionsRepository userOptionsRepository;
    @Autowired private UserRepository userRepository;

    @BeforeEach
    void setup() {
        if (userRepository.findByUsername(USER).isEmpty()) {
            userRepository.save(new User(USER, "{noop}x"));
        }
        userOptionsRepository.deleteById(USER);
    }

    @Test
    void changelogFile_isLoaded_newestFirst() {
        List<ChangelogEntry> all = changelogService.all();

        assertTrue(all.size() >= 2);
        assertEquals(all.getFirst().version(), changelogService.newestVersion());
        all.forEach(entry -> {
            assertFalse(entry.title().isBlank(), entry.version());
            assertFalse(entry.items().isEmpty(), entry.version());
        });
    }

    @Test
    void userWhoNeverSawAnEntry_getsOnlyTheNewest() {
        assertEquals(List.of(changelogService.all().getFirst()), changelogService.unseen(USER));
    }

    @Test
    void userWithAnOlderVersion_getsEverythingNewer() {
        List<ChangelogEntry> all = changelogService.all();
        UserOptions options = new UserOptions(USER, true);
        options.setLastSeenChangelog(all.get(2).version());
        userOptionsRepository.save(options);

        assertEquals(all.subList(0, 2), changelogService.unseen(USER));
    }

    @Test
    void afterMarkSeen_nothingIsUnseen_andOtherOptionsAreKept() {
        userOptionsRepository.save(new UserOptions(USER, false));

        changelogService.markSeen(USER);

        assertTrue(changelogService.unseen(USER).isEmpty());
        assertFalse(userOptionsRepository.findById(USER).orElseThrow().isAutoCollapse());
    }

    @Test
    void unknownVersion_fallsBackToTheNewest() {
        UserOptions options = new UserOptions(USER, true);
        options.setLastSeenChangelog("does-not-exist");
        userOptionsRepository.save(options);

        assertEquals(1, changelogService.unseen(USER).size());
    }
}
