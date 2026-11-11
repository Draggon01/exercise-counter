package org.exercise.counter.exercisecounter.web.rest.exercise.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;

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
        /* IANA time zone of startTime, e.g. Europe/Vienna (null: utcOffset is used) */
        @JsonProperty("timeZone")
        String timeZone,
        @JsonProperty("exerciseType")
        ExerciseType exerciseType,
        @JsonProperty("exerciseValue")
        String exerciseValue,
        @JsonProperty("exerciseIncrease")
        String exerciseIncrease,
        @JsonProperty("visibility")
        Visibility visibility,
        @JsonProperty("groups")
        List<String> groups,
        @JsonProperty("timeLeftSeconds")
        Long timeLeftSeconds,
        @JsonProperty("position")
        Integer position
) {
}
