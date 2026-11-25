package org.exercise.counter.exercisecounter.web.service.media;

import org.exercise.counter.exercisecounter.web.data.detail.ExerciseStepRepository;
import org.exercise.counter.exercisecounter.web.data.media.ExerciseMedia;
import org.exercise.counter.exercisecounter.web.data.media.ExerciseMediaRepository;
import org.exercise.counter.exercisecounter.web.data.media.MediaKind;
import org.exercise.counter.exercisecounter.web.data.media.MediaStatus;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.rest.media.dto.MediaConfigDto;
import org.exercise.counter.exercisecounter.web.rest.media.dto.MediaDto;
import org.exercise.counter.exercisecounter.web.rest.media.dto.MediaUsageDto;
import org.exercise.counter.exercisecounter.web.service.ExerciseAccess;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/** Videos and photos of steps: uploaded by the creator of the exercise, seen by everybody who sees the exercise. */
@Service
public class MediaService {

    private static final Logger log = LoggerFactory.getLogger(MediaService.class);

    /** Uploads waiting for conversion on the whole server: limits the disk space of the raw files. */
    private static final int MAX_WAITING = 20;

    private final MediaProperties properties;
    private final MediaStorage storage;
    private final MediaWorkspace workspace;
    private final MediaQueue queue;
    private final ExerciseMediaRepository mediaRepository;
    private final ExerciseStepRepository stepRepository;
    private final UserRepository userRepository;
    private final ExerciseAccess exerciseAccess;
    private final TransactionTemplate transaction;

    public MediaService(MediaProperties properties, MediaStorage storage, MediaWorkspace workspace, MediaQueue queue,
                        ExerciseMediaRepository mediaRepository, ExerciseStepRepository stepRepository,
                        UserRepository userRepository, ExerciseAccess exerciseAccess, TransactionTemplate transaction) {
        this.properties = properties;
        this.storage = storage;
        this.workspace = workspace;
        this.queue = queue;
        this.mediaRepository = mediaRepository;
        this.stepRepository = stepRepository;
        this.userRepository = userRepository;
        this.exerciseAccess = exerciseAccess;
        this.transaction = transaction;
    }

    public MediaConfigDto config() {
        return new MediaConfigDto(properties.enabled(), properties.maxVideoUpload().toBytes(),
                properties.maxPhotoUpload().toBytes(), (int) properties.maxDuration().toSeconds());
    }

    @Transactional(readOnly = true)
    public MediaUsageDto usage(String username) {
        long used = mediaRepository.findByCreator(username).stream().mapToLong(ExerciseMedia::getSizeBytes).sum();
        return new MediaUsageDto(used, properties.userQuota().toBytes());
    }

    /** Replaces the media of the step; it is converted afterwards (status PROCESSING). */
    public MediaDto upload(UUID exerciseId, UUID stepId, MultipartFile file, String username) {
        if (!properties.enabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Videos and photos are turned off");
        }
        requireOwnStep(exerciseId, stepId, username);
        MediaType type = requireSupported(file);
        // before the file is copied; checked again when it is saved
        requireRoom(stepId, username);
        Path folder = null;
        try {
            folder = workspace.create(UUID.randomUUID());
            Path upload = folder.resolve("upload");
            file.transferTo(upload);
            ExerciseMedia media = transaction.execute(_ -> replace(exerciseId, stepId, type.kind(), username));
            queue.add(media.getMediaId(), upload, type, folder);
            return toDto(media);
        } catch (IOException e) {
            discard(folder);
            log.error("Could not save an upload", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "The file could not be saved");
        } catch (RuntimeException e) {
            discard(folder);
            throw e;
        }
    }

    @Transactional
    public void delete(UUID exerciseId, UUID stepId, String username) {
        requireOwnStep(exerciseId, stepId, username);
        deleteMediaOf(stepId);
    }

    /** The content of a file, if the user may see its exercise. */
    @Transactional(readOnly = true)
    public Resource open(UUID mediaId, MediaFile file, String username) {
        UUID exerciseId = mediaRepository.findExerciseId(mediaId).orElseThrow(MediaService::notFound);
        exerciseAccess.requireVisible(exerciseId, username);
        return storage.open(mediaId, file).orElseThrow(MediaService::notFound);
    }

    /** The main file: the video, or the photo. */
    @Transactional(readOnly = true)
    public MediaFile mainFile(UUID mediaId) {
        MediaKind kind = mediaRepository.findById(mediaId).map(ExerciseMedia::getKind).orElseThrow(MediaService::notFound);
        return kind == MediaKind.VIDEO ? MediaFile.VIDEO : MediaFile.IMAGE;
    }

    /** By step. */
    @Transactional(readOnly = true)
    public Map<UUID, MediaDto> ofExercise(UUID exerciseId) {
        return mediaRepository.findByExerciseId(exerciseId).stream()
                .collect(Collectors.toMap(ExerciseMedia::getStepId, MediaService::toDto));
    }

    @Transactional(readOnly = true)
    public Optional<MediaDto> ofStep(UUID stepId) {
        return mediaRepository.findByStepId(stepId).map(MediaService::toDto);
    }

    /** Call before deleting a step: the cascade does not delete files. */
    public void stepIsDeleted(UUID stepId) {
        mediaRepository.findByStepId(stepId).ifPresent(media -> deleteFilesAfterCommit(List.of(media.getMediaId())));
    }

    /** Call before deleting exercises: the cascade does not delete files. */
    public void exercisesAreDeleted(Collection<UUID> exerciseIds) {
        if (!exerciseIds.isEmpty()) {
            deleteFilesAfterCommit(mediaRepository.findIdsByExerciseIds(exerciseIds));
        }
    }

    private ExerciseMedia replace(UUID exerciseId, UUID stepId, MediaKind kind, String username) {
        userRepository.lock(username); // uploads at the same time must not exceed the quota together
        requireOwnStep(exerciseId, stepId, username);
        requireRoom(stepId, username);
        deleteMediaOf(stepId);
        return mediaRepository.saveAndFlush(new ExerciseMedia(stepId, kind, username));
    }

    private void deleteMediaOf(UUID stepId) {
        mediaRepository.findByStepId(stepId).ifPresent(media -> {
            mediaRepository.delete(media);
            mediaRepository.flush();
            deleteFilesAfterCommit(List.of(media.getMediaId()));
        });
    }

    /** An upload that is still converted counts as large as it may get. */
    private void requireRoom(UUID stepId, String username) {
        if (mediaRepository.countByStatus(MediaStatus.PROCESSING) >= MAX_WAITING) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many uploads at the moment – please try again in a few minutes");
        }
        long maxFile = properties.maxFile().toBytes();
        long used = mediaRepository.findByCreator(username).stream()
                .filter(media -> !media.getStepId().equals(stepId)) // is replaced
                .mapToLong(media -> media.getStatus() == MediaStatus.PROCESSING ? maxFile : media.getSizeBytes())
                .sum();
        if (used + maxFile > properties.userQuota().toBytes()) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE,
                    "Your storage for videos and photos is full – delete some first");
        }
    }

    private MediaType requireSupported(MultipartFile file) {
        byte[] header;
        try (InputStream in = file.getInputStream()) {
            header = in.readNBytes(MediaType.HEADER_BYTES);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The file could not be read");
        }
        if (MediaType.isHeif(header)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "HEIC photos are not supported – please use a JPEG (iPhone: Settings → Camera → Formats → Most Compatible)");
        }
        MediaType type = MediaType.detect(header).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Please choose a video (MP4, MOV, WebM) or a photo (JPEG, PNG, WebP)"));
        long max = (type.kind() == MediaKind.VIDEO ? properties.maxVideoUpload() : properties.maxPhotoUpload()).toBytes();
        if (file.getSize() > max) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "The file is too large (at most " + max / 1024 / 1024 + " MB)");
        }
        return type;
    }

    private void requireOwnStep(UUID exerciseId, UUID stepId, String username) {
        exerciseAccess.requireCreator(exerciseId, username);
        stepRepository.findByStepIdAndExerciseId(stepId, exerciseId)
                .orElseThrow(() -> new NotFoundException("Step not found"));
    }

    /** A rollback keeps the files. */
    private void deleteFilesAfterCommit(List<UUID> mediaIds) {
        if (mediaIds.isEmpty() || !properties.enabled()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (UUID mediaId : mediaIds) {
                    try {
                        storage.delete(mediaId);
                    } catch (IOException e) {
                        log.warn("Could not delete the files of media {}, the cleanup will", mediaId, e);
                    }
                }
            }
        });
    }

    private void discard(Path folder) {
        if (folder != null) {
            workspace.delete(folder);
        }
    }

    private static MediaDto toDto(ExerciseMedia media) {
        return new MediaDto(media.getMediaId(), media.getKind(), media.getStatus(), media.getError(),
                media.getDurationMs(), media.getWidth(), media.getHeight(), media.hasAudio());
    }

    private static NotFoundException notFound() {
        return new NotFoundException("Media not found");
    }
}
