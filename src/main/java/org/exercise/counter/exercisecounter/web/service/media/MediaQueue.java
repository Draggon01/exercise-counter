package org.exercise.counter.exercisecounter.web.service.media;

import jakarta.annotation.PreDestroy;
import org.exercise.counter.exercisecounter.web.data.media.ExerciseMediaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Converts uploads one after the other, so timers and resets do not suffer on a small server. */
@Component
public class MediaQueue implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(MediaQueue.class);

    private final MediaProperties properties;
    private final MediaProcessor processor;
    private final MediaStorage storage;
    private final MediaWorkspace workspace;
    private final ExerciseMediaRepository mediaRepository;
    private final ExecutorService worker = Executors.newSingleThreadExecutor(
            Thread.ofPlatform().name("media").daemon().factory());

    public MediaQueue(MediaProperties properties, MediaProcessor processor, MediaStorage storage,
                      MediaWorkspace workspace, ExerciseMediaRepository mediaRepository) {
        this.properties = properties;
        this.processor = processor;
        this.storage = storage;
        this.workspace = workspace;
        this.mediaRepository = mediaRepository;
    }

    /** What was in the queue when the server stopped is lost. */
    @Override
    public void afterPropertiesSet() {
        if (!properties.enabled()) {
            return;
        }
        int lost = mediaRepository.failAllProcessing("Interrupted by a restart – please upload again");
        if (lost > 0) {
            log.info("{} upload(s) were interrupted by the restart", lost);
        }
        workspace.clear();
    }

    /** @param folder of the upload, deleted afterwards */
    public void add(UUID mediaId, Path upload, MediaType type, Path folder) {
        worker.execute(() -> {
            try {
                process(mediaId, upload, type, folder);
            } catch (RuntimeException e) {
                log.error("Converting media {} failed", mediaId, e);
            } finally {
                workspace.delete(folder);
            }
        });
    }

    private void process(UUID mediaId, Path upload, MediaType type, Path folder) {
        if (!mediaRepository.existsById(mediaId)) {
            return; // deleted while it was waiting
        }
        try {
            MediaProcessor.Result result = processor.convert(upload, type, folder);
            long size = result.sizeBytes();
            if (result.video() != null) {
                storage.store(mediaId, MediaFile.VIDEO, result.video());
            }
            storage.store(mediaId, MediaFile.IMAGE, result.image());
            int updated = mediaRepository.markReady(mediaId, size, result.durationMs(), result.width(), result.height(), result.hasAudio());
            if (updated == 0) { // deleted while it was converted
                storage.delete(mediaId);
            }
        } catch (MediaException e) {
            mediaRepository.markFailed(mediaId, e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); // shutdown: marked as failed on the next start
        } catch (IOException | RuntimeException e) {
            log.error("Converting media {} failed", mediaId, e);
            mediaRepository.markFailed(mediaId, "Something went wrong on the server – please try again later");
        }
    }

    @PreDestroy
    void stop() {
        worker.shutdownNow();
    }
}
