package org.exercise.counter.exercisecounter.web.service.media;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Where finished files are kept. Nothing outside knows their paths, so they can move to another machine later. */
public interface MediaStorage {

    /** Takes over a finished local file (moved, never half visible). */
    void store(UUID mediaId, MediaFile file, Path source) throws IOException;

    /** Supports reading a part of it (range requests). */
    Optional<Resource> open(UUID mediaId, MediaFile file);

    /** Deletes all files of the media (nothing happens if there are none). */
    void delete(UUID mediaId) throws IOException;

    /** Media that have files, with the time of the last change. */
    List<StoredMedia> list() throws IOException;

    record StoredMedia(UUID mediaId, Instant changed) {
    }
}
