package org.exercise.counter.exercisecounter.web.data.detail;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** One step of an exercise, e.g. "Wall sit, 3 × 30 s". Reps or duration, not both; all numbers are optional. */
@Entity
@Table(name = "exercise_step")
public class ExerciseStep {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "step_id")
    private UUID stepId;

    @Column(name = "exercise_id", nullable = false, updatable = false)
    private UUID exerciseId;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String hints = "";

    @Column
    private Integer sets;

    @Column
    private Integer reps;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "rest_seconds")
    private Integer restSeconds;

    public ExerciseStep() {
    }

    public ExerciseStep(UUID exerciseId, int position) {
        this.exerciseId = exerciseId;
        this.position = position;
    }

    public UUID getStepId() {
        return stepId;
    }

    public UUID getExerciseId() {
        return exerciseId;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getHints() {
        return hints;
    }

    public void setHints(String hints) {
        this.hints = hints;
    }

    public Integer getSets() {
        return sets;
    }

    public void setSets(Integer sets) {
        this.sets = sets;
    }

    public Integer getReps() {
        return reps;
    }

    public void setReps(Integer reps) {
        this.reps = reps;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Integer getRestSeconds() {
        return restSeconds;
    }

    public void setRestSeconds(Integer restSeconds) {
        this.restSeconds = restSeconds;
    }
}
