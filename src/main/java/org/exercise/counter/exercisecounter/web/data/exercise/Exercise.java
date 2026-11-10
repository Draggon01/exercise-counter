package org.exercise.counter.exercisecounter.web.data.exercise;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;
import java.util.Objects;

@Entity
public class Exercise {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column
    private UUID exerciseId;

    @Column
    private String exerciseTitle;

    @Column
    private String creator;

    @Column
    private Integer daysRepeat;

    @Column
    private LocalTime startTime;

    @Column
    private Integer utcOffset;

    @Enumerated(EnumType.STRING)
    @Column
    private ExerciseType exerciseType;

    @Column
    private String exerciseValue;

    @Column
    private String exerciseIncrease;

    @Enumerated(EnumType.STRING)
    @Column
    private Visibility visibility;

    @Column
    private LocalDateTime lastSchedulerRun;

    public Exercise() {
    }

    public Exercise(UUID exerciseId, String exerciseTitle, String creator, Integer daysRepeat, LocalTime startTime, Integer utcOffset, ExerciseType exerciseType, String exerciseValue, String exerciseIncrease, Visibility visibility, LocalDateTime lastSchedulerRun) {
        this.exerciseId = exerciseId;
        this.exerciseTitle = exerciseTitle;
        this.creator = creator;
        this.daysRepeat = daysRepeat;
        this.startTime = startTime;
        this.utcOffset = utcOffset;
        this.exerciseType = exerciseType;
        this.exerciseValue = exerciseValue;
        this.exerciseIncrease = exerciseIncrease;
        this.visibility = visibility;
        this.lastSchedulerRun = lastSchedulerRun;
    }

    public UUID getExerciseId() {
        return this.exerciseId;
    }

    public String getExerciseTitle() {
        return this.exerciseTitle;
    }

    public String getCreator() {
        return this.creator;
    }

    public Integer getDaysRepeat() {
        return this.daysRepeat;
    }

    public LocalTime getStartTime() {
        return this.startTime;
    }

    public Integer getUtcOffset() {
        return this.utcOffset;
    }

    public ExerciseType getExerciseType() {
        return this.exerciseType;
    }

    public String getExerciseValue() {
        return this.exerciseValue;
    }

    public String getExerciseIncrease() {
        return this.exerciseIncrease;
    }

    public Visibility getVisibility() {
        return this.visibility;
    }

    public LocalDateTime getLastSchedulerRun() {
        return this.lastSchedulerRun;
    }

    public void setExerciseId(UUID exerciseId) {
        this.exerciseId = exerciseId;
    }

    public void setExerciseTitle(String exerciseTitle) {
        this.exerciseTitle = exerciseTitle;
    }

    public void setCreator(String creator) {
        this.creator = creator;
    }

    public void setDaysRepeat(Integer daysRepeat) {
        this.daysRepeat = daysRepeat;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public void setUtcOffset(Integer utcOffset) {
        this.utcOffset = utcOffset;
    }

    public void setExerciseType(ExerciseType exerciseType) {
        this.exerciseType = exerciseType;
    }

    public void setExerciseValue(String exerciseValue) {
        this.exerciseValue = exerciseValue;
    }

    public void setExerciseIncrease(String exerciseIncrease) {
        this.exerciseIncrease = exerciseIncrease;
    }

    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    public void setLastSchedulerRun(LocalDateTime lastSchedulerRun) {
        this.lastSchedulerRun = lastSchedulerRun;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Exercise other)) return false;
        return Objects.equals(getDaysRepeat(), other.getDaysRepeat()) &&
                Objects.equals(getUtcOffset(), other.getUtcOffset()) &&
                Objects.equals(getExerciseId(), other.getExerciseId()) &&
                Objects.equals(getExerciseTitle(), other.getExerciseTitle()) &&
                Objects.equals(getCreator(), other.getCreator()) &&
                Objects.equals(getStartTime(), other.getStartTime()) &&
                Objects.equals(getExerciseType(), other.getExerciseType()) &&
                Objects.equals(getExerciseValue(), other.getExerciseValue()) &&
                Objects.equals(getExerciseIncrease(), other.getExerciseIncrease()) &&
                Objects.equals(getVisibility(), other.getVisibility()) &&
                Objects.equals(getLastSchedulerRun(), other.getLastSchedulerRun());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getDaysRepeat(), getUtcOffset(), getExerciseId(), getExerciseTitle(), getCreator(), getStartTime(), getExerciseType(), getExerciseValue(), getExerciseIncrease(), getVisibility(), getLastSchedulerRun());
    }

    @Override
    public String toString() {
        return "Exercise(exerciseId=" + this.getExerciseId() + ", exerciseTitle=" + this.getExerciseTitle() + ", creator=" + this.getCreator() + ", daysRepeat=" + this.getDaysRepeat() + ", startTime=" + this.getStartTime() + ", utcOffset=" + this.getUtcOffset() + ", exerciseType=" + this.getExerciseType() + ", exerciseValue=" + this.getExerciseValue() + ", exerciseIncrease=" + this.getExerciseIncrease() + ", visibility=" + this.getVisibility() + ", lastSchedulerRun=" + this.getLastSchedulerRun() + ")";
    }
}
