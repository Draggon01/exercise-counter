package org.exercise.counter.exercisecounter.web.service.media;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

/** Files in {@code app.media.dir}, named only by the media id. */
@Component
public class LocalMediaStorage implements MediaStorage {

    private final MediaProperties properties;

    public LocalMediaStorage(MediaProperties properties) {
        this.properties = properties;
    }

    @Override
    public void store(UUID mediaId, MediaFile file, Path source) throws IOException {
        Files.createDirectories(dir());
        Files.move(source, path(mediaId, file), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public Optional<Resource> open(UUID mediaId, MediaFile file) {
        if (!properties.enabled()) {
            return Optional.empty();
        }
        return Optional.<Resource>of(new FileSystemResource(path(mediaId, file))).filter(Resource::exists);
    }

    @Override
    public void delete(UUID mediaId) throws IOException {
        for (MediaFile file : MediaFile.values()) {
            Files.deleteIfExists(path(mediaId, file));
        }
    }

    @Override
    public List<StoredMedia> list() throws IOException {
        if (!Files.isDirectory(dir())) {
            return List.of();
        }
        List<StoredMedia> media = new ArrayList<>();
        try (Stream<Path> files = Files.list(dir())) {
            for (Path file : (Iterable<Path>) files.filter(Files::isRegularFile)::iterator) {
                Optional<UUID> id = idOf(file.getFileName().toString());
                if (id.isPresent()) { // anything else is not ours
                    media.add(new StoredMedia(id.get(), Files.getLastModifiedTime(file).toInstant()));
                }
            }
        }
        return media;
    }

    private static Optional<UUID> idOf(String fileName) {
        for (MediaFile file : MediaFile.values()) {
            if (fileName.endsWith(file.suffix())) {
                try {
                    return Optional.of(UUID.fromString(fileName.substring(0, fileName.length() - file.suffix().length())));
                } catch (IllegalArgumentException e) {
                    return Optional.empty();
                }
            }
        }
        return Optional.empty();
    }

    private Path dir() {
        return Path.of(properties.dir());
    }

    private Path path(UUID mediaId, MediaFile file) {
        return dir().resolve(mediaId + file.suffix());
    }
}
