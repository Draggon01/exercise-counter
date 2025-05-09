package org.exercise.counter.exercisecounter.web.data.statistic;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;

import java.util.UUID;

@Entity(name = "statistic_exercise_data")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatisticJpa {
    @Id
    private UUID exerciseId;

    @Type(JsonType.class)
    @Column(columnDefinition = "json")
    private Statistic statistic;
}
