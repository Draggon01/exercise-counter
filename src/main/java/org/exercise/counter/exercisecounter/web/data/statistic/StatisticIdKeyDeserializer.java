package org.exercise.counter.exercisecounter.web.data.statistic;

import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.KeyDeserializer;

public class StatisticIdKeyDeserializer extends KeyDeserializer {
    @Override
    public Object deserializeKey(String key, DeserializationContext deserializationContext) {
        try {
            return StatisticId.fromString(key);
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize StatisticId key: " + key, e);
        }
    }
}
