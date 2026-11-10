package org.exercise.counter.exercisecounter.web.data.statistic;

import org.exercise.counter.exercisecounter.web.data.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface FinishedUserRepository extends JpaRepository<FinishedUser, UUID> {

    List<FinishedUser> findByPeriod_PeriodId(UUID periodId);

    boolean existsByPeriod_PeriodIdAndUsername(UUID periodId, User username);

    /** Who finished which period, for all periods of the given exercises – one query instead of one per period. */
    @Query("select new org.exercise.counter.exercisecounter.web.data.statistic.PeriodFinisher("
            + "fu.period.exercise.exerciseId, fu.period.periodId, fu.username.username) "
            + "from FinishedUser fu where fu.period.exercise.exerciseId in :exerciseIds")
    List<PeriodFinisher> findFinishersByExerciseIds(@Param("exerciseIds") Collection<UUID> exerciseIds);
}