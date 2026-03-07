package org.exercise.counter.exercisecounter.web.data.statistic;

import org.exercise.counter.exercisecounter.web.data.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FinishedUserRepository extends JpaRepository<FinishedUser, UUID> {

    List<FinishedUser> findByPeriod_PeriodId(UUID periodId);

    boolean existsByPeriod_PeriodIdAndUsername(UUID periodId, User username);
}