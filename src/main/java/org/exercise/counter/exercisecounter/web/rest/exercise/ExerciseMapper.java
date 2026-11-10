package org.exercise.counter.exercisecounter.web.rest.exercise;

import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Converts between the {@link Exercise} entity and {@link ExerciseDto}.
 */
public final class ExerciseMapper {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm:ss");

    private ExerciseMapper() {
    }

    /**
     * @param groups          names of the groups the exercise is shared with
     * @param timeLeftSeconds seconds until the next reset (from the scheduler)
     * @param position        sort position in the user's list, {@code null} if not selected
     */
    public static ExerciseDto toDto(Exercise exercise, List<String> groups, long timeLeftSeconds, Integer position) {
        return new ExerciseDto(
                exercise.getExerciseId(),
                exercise.getExerciseTitle(),
                exercise.getCreator(),
                exercise.getDaysRepeat(),
                exercise.getStartTime().format(TIME_FORMAT),
                exercise.getUtcOffset(),
                exercise.getExerciseType(),
                exercise.getExerciseValue(),
                exercise.getExerciseIncrease(),
                exercise.getVisibility(),
                groups,
                timeLeftSeconds,
                position);
    }

    /**
     * Builds the entity to save. {@code lastSchedulerRun} is reset on purpose: after an edit the
     * scheduler recalculates the next reset from the (possibly changed) start time.
     *
     * @param creator the authenticated user – the creator sent by the client is ignored
     */
    public static Exercise toEntity(ExerciseDto dto, String creator) {
        return new Exercise(
                dto.exerciseId(),
                dto.exerciseTitle(),
                creator,
                dto.daysRepeat(),
                LocalTime.parse(dto.startTime(), TIME_FORMAT),
                dto.utcOffset(),
                dto.exerciseType(),
                dto.exerciseValue(),
                dto.exerciseIncrease(),
                dto.visibility(),
                null);
    }
}
