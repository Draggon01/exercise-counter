package org.exercise.counter.exercisecounter.web.data.statistic;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface StatisticRepository extends JpaRepository<StatisticJpa, UUID> {

}
