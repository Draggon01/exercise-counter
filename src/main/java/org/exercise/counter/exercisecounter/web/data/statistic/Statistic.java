package org.exercise.counter.exercisecounter.web.data.statistic;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;


@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Statistic implements Serializable {

    @JsonDeserialize(keyUsing = StatisticIdKeyDeserializer.class)
    private Map<StatisticId, List<String>> finishedInformation = new LinkedHashMap<>();

    public Statistic() {

    }

    @JsonCreator(mode = JsonCreator.Mode.PROPERTIES)
    public Statistic(@JsonProperty("finishedInformation") Map<StatisticId, List<String>> finishedInformation) {
        if (finishedInformation != null) {
            this.finishedInformation.putAll(finishedInformation);
        }
    }

    public void upsertInformation(StatisticId statisticId, List<String> users) {
        finishedInformation.put(statisticId, users);
    }

    public void removeInformation(StatisticId statisticId) {
        finishedInformation.remove(statisticId);
    }
}
