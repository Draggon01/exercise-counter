package org.exercise.counter.exercisecounter.web.service.media;

import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/** Local working files while something is uploaded or converted: one folder per media ({@code app.media.dir/work}). */
@Component
public class MediaWorkspace {

    private final MediaProperties properties;

    public MediaWorkspace(MediaProperties properties) {
        this.properties = properties;
    }

    /** The (new) folder of an upload. */
    public Path create(UUID uploadId) throws IOException {
        return Files.createDirectories(root().resolve(uploadId.toString()));
    }

    public void delete(Path folder) {
        try {
            FileSystemUtils.deleteRecursively(folder);
        } catch (IOException e) {
            LoggerFactory.getLogger(MediaWorkspace.class).warn("Could not delete {}", folder, e);
        }
    }

    /** After a restart nothing in there is used any more. */
    public void clear() {
        delete(root());
    }

    private Path root() {
        return Path.of(properties.dir()).resolve("work");
    }
}
