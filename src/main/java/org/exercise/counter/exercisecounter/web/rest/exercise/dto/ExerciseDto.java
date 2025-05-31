package org.exercise.counter.exercisecounter.web.rest.exercise.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibiltiy;

import java.util.List;
import java.util.UUID;

public record ExerciseDto(
        @JsonProperty("exerciseId")
        UUID exerciseId,
        @JsonProperty("exerciseTitle")
        String exerciseTitle,
        @JsonProperty("creator")
        String creator,
        @JsonProperty("daysRepeat")
        Integer daysRepeat,
        @JsonProperty("startTime")
        String startTime,
        @JsonProperty("utcOffset")
        Integer utcOffset,
        @JsonProperty("exerciseType")
        ExerciseType exerciseType,
        @JsonProperty("exerciseValue")
        String exerciseValue,
        @JsonProperty("exerciseIncrease")
        String exerciseIncrease,
        @JsonProperty("visibility")
        Visibiltiy visibility,
        @JsonProperty("groups")
        List<String> groups
) {
}
