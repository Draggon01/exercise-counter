package org.exercise.counter.exercisecounter.serialization;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.exercise.counter.exercisecounter.web.data.statistic.Statistic;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticId;
import org.exercise.counter.exercisecounter.web.data.statistic.StatisticJpa;
import org.junit.Test;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class TestSerializeStatistic {

    private static final Logger log = LoggerFactory.getLogger(TestSerializeStatistic.class);
    @Test
    public void testStatisticElement() throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        Statistic statistic = new Statistic();

        statistic.upsertInformation(new StatisticId(2), List.of("user1", "user2"));
        statistic.upsertInformation(new StatisticId(Instant.now().plusSeconds(100000)), List.of("user3"));
        statistic.upsertInformation(new StatisticId(Instant.now().plusSeconds(200000)), List.of("user3"));
        statistic.upsertInformation(new StatisticId(Instant.now().plusSeconds(300000)), List.of("user3"));
        String json = objectMapper.writeValueAsString(statistic);
        System.out.println(json);

        Statistic statistic1 = objectMapper.readValue(json, Statistic.class);
        System.out.println(statistic1);

        StatisticJpa jpa = new StatisticJpa(UUID.randomUUID(), statistic);
        json = objectMapper.writeValueAsString(jpa);
        System.out.println(json);

        jpa = objectMapper.readValue(json, StatisticJpa.class);
        System.out.println(jpa);
    }

    @Test
    public void serializeEmptyStatistic() throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        Statistic statistic = new Statistic();

        String s = objectMapper.writeValueAsString(statistic);
        System.out.println(s);
    }

    @Test
    public void statisticIdConstructorTest() {
        StatisticId statisticId = new StatisticId(new Date().toInstant());
        System.out.println(statisticId);
    }
}
