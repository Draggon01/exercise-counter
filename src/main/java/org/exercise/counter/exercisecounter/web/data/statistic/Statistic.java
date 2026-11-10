package org.exercise.counter.exercisecounter.web.data.statistic;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.annotation.JsonDeserialize;

import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

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

    public Map<StatisticId, List<String>> getFinishedInformation() {
        return this.finishedInformation;
    }

    public void setFinishedInformation(Map<StatisticId, List<String>> finishedInformation) {
        this.finishedInformation = finishedInformation;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Statistic other)) return false;
        return Objects.equals(getFinishedInformation(), other.getFinishedInformation());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getFinishedInformation());
    }

    @Override
    public String toString() {
        return "Statistic(finishedInformation=" + this.getFinishedInformation() + ")";
    }
}
