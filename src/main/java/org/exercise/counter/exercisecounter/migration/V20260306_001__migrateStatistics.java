package org.exercise.counter.exercisecounter.migration;

import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseRepository;
import org.exercise.counter.exercisecounter.web.data.statistic.*;
import org.exercise.counter.exercisecounter.web.data.user.User;
import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.springframework.stereotype.Component;
import io.hypersistence.utils.hibernate.type.range.Range;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class V20260306_001__migrateStatistics implements DataMigration {

    private final StatisticRepository statisticRepository;
    private final UserRepository userRepository;
    private final PeriodRepository periodRepository;
    private final ExerciseRepository exerciseRepository;
    private final FinishedUserRepository finishedUserRepository;

    public V20260306_001__migrateStatistics(StatisticRepository statisticRepository, UserRepository userRepository, PeriodRepository periodRepository, ExerciseRepository exerciseRepository, FinishedUserRepository finishedUserRepository) {
        this.statisticRepository = statisticRepository;
        this.userRepository = userRepository;
        this.periodRepository = periodRepository;
        this.exerciseRepository = exerciseRepository;
        this.finishedUserRepository = finishedUserRepository;
    }

    @Override
    public void migrate() {
        List<StatisticJpa> all = statisticRepository.findAll();
        for (StatisticJpa statisticJpa : all) {
            Statistic statistic = statisticJpa.getStatistic();
            Map<StatisticId, List<String>> finishedInformation =
                    statistic.getFinishedInformation();
            UUID exerciseId = statisticJpa.getExerciseId();
            Exercise exercise = exerciseRepository.findById(exerciseId).orElseThrow();

            finishedInformation.forEach((k,v) -> {
                //for every entry add a Date range, which should reference the exercise
                Range<LocalDateTime> dateRange = toDateRange(k.startingDate(), k.endingDate());
                Period period = new Period();
                period.setExercise(exercise);
                period.setTimeRange(dateRange);

                Period saved = periodRepository.save(period);
                //than add all the corresponding users to the finished_user repo with reference to the period
                v.forEach(username -> {
                    User user = userRepository.findByUsername(username).orElseThrow();
                    FinishedUser finishedUser = new FinishedUser();
                    finishedUser.setUsername(user);
                    finishedUser.setPeriod(saved);
                    finishedUserRepository.save(finishedUser);
                });
            });
        }
    }

    public static Range<LocalDateTime> toDateRange(LocalDateTime from, LocalDateTime to) {
        if(from.equals(to)) {
            return Range.closed(from, from);
        }
        return Range.closedOpen(from, to);
    }}
