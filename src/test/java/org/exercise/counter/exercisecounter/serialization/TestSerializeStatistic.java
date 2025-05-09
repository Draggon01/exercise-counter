package org.exercise.counter.exercisecounter.serialization;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.exercise.counter.exercisecounter.web.data.statistic.Statistic;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticId;
import org.junit.Test;

import java.util.List;

@Slf4j
public class TestSerializeStatistic {
    @Test
    public void testStatisticElement() throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        Statistic statistic = new Statistic();

        statistic.upsertInformation(new StatisticId(), List.of("user1", "user2"));

        String json = objectMapper.writeValueAsString(statistic);
        System.out.println(json);

        Statistic statistic1 = objectMapper.readValue(json, Statistic.class);
        System.out.println(statistic1);

    }

    @Test
    public void serializeEmptyStatistic() throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        Statistic statistic = new Statistic();

        String s = objectMapper.writeValueAsString(statistic);
        System.out.println(s);
    }
}
