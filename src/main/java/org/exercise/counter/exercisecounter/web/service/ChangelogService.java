package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.options.UserOptions;
import org.exercise.counter.exercisecounter.web.data.options.UserOptionsRepository;
import org.exercise.counter.exercisecounter.web.rest.changelog.dto.ChangelogEntry;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.HashSet;
import java.util.List;

/**
 * The changelog ({@code changelog.json}, newest entry first) and which entries a user has not seen yet.
 */
@Service
public class ChangelogService {

    static final String CHANGELOG_FILE = "changelog.json";

    private final List<ChangelogEntry> entries;
    private final UserOptionsRepository userOptionsRepository;

    public ChangelogService(JsonMapper jsonMapper, UserOptionsRepository userOptionsRepository) {
        this.userOptionsRepository = userOptionsRepository;
        this.entries = load(jsonMapper);
    }

    private static List<ChangelogEntry> load(JsonMapper jsonMapper) {
        try (InputStream in = new ClassPathResource(CHANGELOG_FILE).getInputStream()) {
            List<ChangelogEntry> loaded = List.copyOf(jsonMapper.readValue(in, new TypeReference<List<ChangelogEntry>>() {
            }));
            if (loaded.isEmpty()) {
                throw new IllegalStateException(CHANGELOG_FILE + " must contain at least one entry");
            }
            if (new HashSet<>(loaded.stream().map(ChangelogEntry::version).toList()).size() != loaded.size()) {
                throw new IllegalStateException(CHANGELOG_FILE + " contains a version twice");
            }
            return loaded;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + CHANGELOG_FILE, e);
        }
    }

    /** All entries, newest first. */
    public List<ChangelogEntry> all() {
        return entries;
    }

    public String newestVersion() {
        return entries.getFirst().version();
    }

    /**
     * Entries newer than the last one the user has seen. A user who never saw one (or whose version
     * no longer exists) only gets the newest entry, not the whole history.
     */
    @Transactional(readOnly = true)
    public List<ChangelogEntry> unseen(String username) {
        String lastSeen = userOptionsRepository.findById(username).map(UserOptions::getLastSeenChangelog).orElse(null);
        int seenIndex = lastSeen == null ? -1 : entries.stream().map(ChangelogEntry::version).toList().indexOf(lastSeen);
        return seenIndex < 0 ? List.of(entries.getFirst()) : entries.subList(0, seenIndex);
    }

    /** Marks everything up to the newest entry as seen. */
    @Transactional
    public void markSeen(String username) {
        UserOptions options = userOptionsRepository.findById(username).orElseGet(() -> new UserOptions(username, true));
        options.setLastSeenChangelog(newestVersion());
        userOptionsRepository.save(options);
    }
}
