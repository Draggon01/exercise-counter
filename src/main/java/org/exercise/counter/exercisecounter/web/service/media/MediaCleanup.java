package org.exercise.counter.exercisecounter.web.service.media;

import org.exercise.counter.exercisecounter.web.data.media.ExerciseMediaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Safety net: every night deletes files that no row refers to (older than a day). */
@Component
public class MediaCleanup {

    private static final Logger log = LoggerFactory.getLogger(MediaCleanup.class);

    private final MediaProperties properties;
    private final MediaStorage storage;
    private final ExerciseMediaRepository mediaRepository;
    private final ThreadPoolTaskScheduler taskScheduler;

    public MediaCleanup(MediaProperties properties, MediaStorage storage, ExerciseMediaRepository mediaRepository,
                        ThreadPoolTaskScheduler taskScheduler) {
        this.properties = properties;
        this.storage = storage;
        this.mediaRepository = mediaRepository;
        this.taskScheduler = taskScheduler;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        if (properties.enabled()) {
            taskScheduler.schedule(this::run, new CronTrigger("0 30 3 * * *"));
        }
    }

    private void run() {
        try {
            clean(Instant.now());
        } catch (IOException | RuntimeException e) {
            log.error("Media cleanup failed, nothing more is deleted", e);
        }
    }

    /** If the database cannot be read this fails before anything is deleted. */
    public int clean(Instant now) throws IOException {
        List<MediaStorage.StoredMedia> stored = storage.list();
        Set<UUID> used = new HashSet<>(mediaRepository.findAllIds());
        Instant limit = now.minus(Duration.ofDays(1));
        int deleted = 0;
        for (MediaStorage.StoredMedia media : stored) {
            if (!used.contains(media.mediaId()) && media.changed().isBefore(limit)) {
                storage.delete(media.mediaId());
                deleted++;
            }
        }
        if (deleted > 0) {
            log.info("Deleted {} media file(s) without an entry", deleted);
        }
        return deleted;
    }
}
