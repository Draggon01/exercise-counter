package org.exercise.counter.exercisecounter.web.data.statistic;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import lombok.NonNull;

import java.io.Serializable;
import java.text.ParseException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@JsonSerialize
public record StatisticId(
        @JsonProperty("startingDate") LocalDateTime startingDate,
        @JsonProperty("endingDate") LocalDateTime endingDate
) implements Serializable {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static StatisticId fromString(String key) throws ParseException {
        // Expected format: "2025-01-01:2025-01-07"
        String[] parts = key.split(":");
        LocalDateTime start = LocalDate.parse(parts[0], FORMAT).atStartOfDay();
        LocalDateTime end = LocalDate.parse(parts[1], FORMAT).atStartOfDay();
        return new StatisticId(start, end);

    }

    @JsonValue
    public String toKeyString() {
        return FORMAT.format(startingDate) + ":" + FORMAT.format(endingDate);
    }

    public StatisticId() {
        this(LocalDateTime.now(), LocalDateTime.now());
    }

    public StatisticId(Integer offset) {
        this(createNowToOffset(offset), createNowToOffset(offset));
    }

    private static LocalDateTime createNowToOffset(Integer offset) {
        return LocalDateTime.now(ZoneId.systemDefault()).plusHours(offset);
    }

    public StatisticId(Instant now) {
        this(LocalDateTime.ofInstant(now, ZoneId.systemDefault()),
                LocalDateTime.ofInstant(now, ZoneId.systemDefault()));
    }

    @Override
    public boolean equals(Object obj) {
        if (obj instanceof StatisticId other) {
            return this.toKeyString().equals(other.toKeyString());
        }
        return false;
    }

    @Override
    @NonNull
    public String toString() {
        return toKeyString();
    }

    @Override
    public int hashCode() {
        return this.toKeyString().hashCode();
    }
}
