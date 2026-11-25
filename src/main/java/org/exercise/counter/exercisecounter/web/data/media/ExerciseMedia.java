package org.exercise.counter.exercisecounter.web.data.media;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Video or photo of a step. Its files are stored under the id, see MediaStorage. */
@Entity
@Table(name = "exercise_media")
public class ExerciseMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "media_id")
    private UUID mediaId;

    @Column(name = "step_id", nullable = false, updatable = false)
    private UUID stepId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private MediaKind kind;

    @Column(name = "uploaded_by", updatable = false)
    private String uploadedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MediaStatus status = MediaStatus.PROCESSING;

    @Column
    private String error;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column
    private Integer width;

    @Column
    private Integer height;

    @Column(name = "has_audio", nullable = false)
    private boolean hasAudio;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now(ZoneOffset.UTC);

    public ExerciseMedia() {
    }

    public ExerciseMedia(UUID stepId, MediaKind kind, String uploadedBy) {
        this.stepId = stepId;
        this.kind = kind;
        this.uploadedBy = uploadedBy;
    }

    public UUID getMediaId() {
        return mediaId;
    }

    public UUID getStepId() {
        return stepId;
    }

    public MediaKind getKind() {
        return kind;
    }

    public MediaStatus getStatus() {
        return status;
    }

    public String getError() {
        return error;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public Integer getDurationMs() {
        return durationMs;
    }

    public Integer getWidth() {
        return width;
    }

    public Integer getHeight() {
        return height;
    }

    public boolean hasAudio() {
        return hasAudio;
    }
}
