package org.exercise.counter.exercisecounter.web.data.statistic;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import lombok.NonNull;
import org.hibernate.annotations.NotFound;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@JsonSerialize
public record StatisticId(
        @JsonProperty("startingDate") Date startingDate, @JsonProperty("endingDate") Date endingDate
) {

    private static final SimpleDateFormat FORMAT = new SimpleDateFormat("yyyy-MM-dd");

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static StatisticId fromString(String key) throws ParseException {
        // Expected format: "2025-01-01:2025-01-07"
        String[] parts = key.split(":");
        Date start = FORMAT.parse(parts[0]);
        Date end = FORMAT.parse(parts[1]);
        return new StatisticId(start, end);
    }

    @JsonValue
    public String toKeyString() {
        return FORMAT.format(startingDate) + ":" + FORMAT.format(endingDate);
    }

    public StatisticId() {
        this(new Date(), new Date());
    }

    public StatisticId(Integer offset){
        this(createNowToOffset(offset), createNowToOffset(offset));
    }

    private static Date createNowToOffset(Integer offset){
        LocalDateTime localDateTime = LocalDateTime.now(ZoneId.systemDefault()).plusHours(offset);
        return Date.from(localDateTime.atZone(ZoneId.systemDefault()).toInstant());
    }

    public StatisticId(Instant now) {
        this(Date.from(now), Date.from(now));
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
