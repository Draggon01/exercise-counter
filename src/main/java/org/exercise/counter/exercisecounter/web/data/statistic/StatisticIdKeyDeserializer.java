package org.exercise.counter.exercisecounter.web.data.statistic;

import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.KeyDeserializer;

import java.io.IOException;

public class StatisticIdKeyDeserializer extends KeyDeserializer {
    @Override
    public Object deserializeKey(String key, DeserializationContext deserializationContext) throws IOException {
        try {
            return StatisticId.fromString(key);
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize StatisticId key: " + key, e);
        }
    }
}
