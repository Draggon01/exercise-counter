package org.exercise.counter.exercisecounter.web.data.detail;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Description of an exercise; exercises without one have no row. */
@Entity
@Table(name = "exercise_detail")
public class ExerciseDetail {

    @Id
    @Column(name = "exercise_id")
    private UUID exerciseId;

    @Column(nullable = false)
    private String description = "";

    @Enumerated(EnumType.STRING)
    @Column(name = "guided_mode", nullable = false)
    private GuidedMode guidedMode = GuidedMode.OFF;

    /** Countdown before a timed step of the guided workout; 0 = off. */
    @Column(name = "get_ready_seconds", nullable = false)
    private int getReadySeconds = 5;

    public ExerciseDetail() {
    }

    public ExerciseDetail(UUID exerciseId) {
        this.exerciseId = exerciseId;
    }

    public UUID getExerciseId() {
        return exerciseId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public GuidedMode getGuidedMode() {
        return guidedMode;
    }

    public void setGuidedMode(GuidedMode guidedMode) {
        this.guidedMode = guidedMode;
    }

    public int getGetReadySeconds() {
        return getReadySeconds;
    }

    public void setGetReadySeconds(int getReadySeconds) {
        this.getReadySeconds = getReadySeconds;
    }
}
