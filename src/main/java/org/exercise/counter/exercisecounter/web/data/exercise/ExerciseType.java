package org.exercise.counter.exercisecounter.web.data.exercise;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public enum ExerciseType {
    NUMBERREPEAT("Repeat a Single amount"),
    TIMEREPEAT("Repeat a single time"),
    NUMBERINCREASE("Repeat with an increasing number"),
    TIMEINCREASE("Repeat with an increasing time");

    private final String description;

    ExerciseType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }

    public static List<ExerciseType> getAll() {
        return new ArrayList<>(List.of(values()));
    }

    public static List<String> getAllDescriptions() {
        return Arrays.stream(values()).map(v -> v.description).toList();
    }

    public static ExerciseType fromDescription(String description) {
        return Arrays.stream(values()).filter(v -> v.name().equalsIgnoreCase(description)).findFirst().orElse(null);
    }
}
