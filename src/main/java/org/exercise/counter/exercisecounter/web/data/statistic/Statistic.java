package org.exercise.counter.exercisecounter.web.data.statistic;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class Statistic {
    private Map<StatisticId, List<String>> finishedInformation = new HashMap<>();

    public void upsertInformation(StatisticId statisticId, List<String> users) {
        finishedInformation.put(statisticId, users);
    }

    public void removeInformation(StatisticId statisticId) {
        finishedInformation.remove(statisticId);
    }
}
