package org.exercise.counter.exercisecounter.web.data.media;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseMediaRepository extends JpaRepository<ExerciseMedia, UUID> {

    Optional<ExerciseMedia> findByStepId(UUID stepId);

    @Query("select m from ExerciseMedia m, ExerciseStep s where s.stepId = m.stepId and s.exerciseId = :exerciseId")
    List<ExerciseMedia> findByExerciseId(UUID exerciseId);

    @Query("select m.mediaId from ExerciseMedia m, ExerciseStep s where s.stepId = m.stepId and s.exerciseId in :exerciseIds")
    List<UUID> findIdsByExerciseIds(Collection<UUID> exerciseIds);

    /** Media of all exercises the user is the creator of: they count towards the user's quota. */
    @Query("select m from ExerciseMedia m, ExerciseStep s, Exercise e where s.stepId = m.stepId "
            + "and e.exerciseId = s.exerciseId and e.creator = :creator")
    List<ExerciseMedia> findByCreator(String creator);

    @Query("select s.exerciseId from ExerciseMedia m, ExerciseStep s where s.stepId = m.stepId and m.mediaId = :mediaId")
    Optional<UUID> findExerciseId(UUID mediaId);

    @Query("select m.mediaId from ExerciseMedia m")
    List<UUID> findAllIds();

    long countByStatus(MediaStatus status);

    /** The conversion is finished; 0 if the media was deleted or replaced in the meantime. */
    @Modifying
    @Transactional
    @Query("update ExerciseMedia m set m.status = MediaStatus.READY, m.sizeBytes = :sizeBytes, m.durationMs = :durationMs, "
            + "m.width = :width, m.height = :height, m.hasAudio = :hasAudio "
            + "where m.mediaId = :mediaId and m.status = MediaStatus.PROCESSING")
    int markReady(UUID mediaId, long sizeBytes, Integer durationMs, int width, int height, boolean hasAudio);

    @Modifying
    @Transactional
    @Query("update ExerciseMedia m set m.status = MediaStatus.FAILED, m.error = :error "
            + "where m.mediaId = :mediaId and m.status = MediaStatus.PROCESSING")
    int markFailed(UUID mediaId, String error);

    @Modifying
    @Transactional
    @Query("update ExerciseMedia m set m.status = MediaStatus.FAILED, m.error = :error where m.status = MediaStatus.PROCESSING")
    int failAllProcessing(String error);
}
