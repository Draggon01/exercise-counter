package org.exercise.counter.exercisecounter.exercise;

import org.exercise.counter.exercisecounter.web.data.exercise.Exercise;
import org.exercise.counter.exercisecounter.web.data.exercise.ExerciseType;
import org.exercise.counter.exercisecounter.web.data.exercise.Visibility;
import org.exercise.counter.exercisecounter.web.rest.exercise.ExerciseMapper;
import org.exercise.counter.exercisecounter.web.rest.exercise.dto.ExerciseDto;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ExerciseMapperTest {

    private static final UUID ID = UUID.randomUUID();

    @Test
    void toDto_mapsAllFields() {
        Exercise exercise = new Exercise(ID, "Squats", "alice", 2, LocalTime.of(7, 5, 9), 1,
                ExerciseType.TIMEINCREASE, "60", "5", Visibility.GROUPS, LocalDateTime.now());

        ExerciseDto dto = ExerciseMapper.toDto(exercise, List.of("team"), 3600L, 4);

        assertEquals(new ExerciseDto(ID, "Squats", "alice", 2, "07:05:09", 1, ExerciseType.TIMEINCREASE,
                "60", "5", Visibility.GROUPS, List.of("team"), 3600L, 4), dto);
    }

    @Test
    void toEntity_usesGivenCreatorAndResetsLastSchedulerRun() {
        ExerciseDto dto = new ExerciseDto(ID, "Squats", "mallory", 2, "07:05:09", 1, ExerciseType.TIMEINCREASE,
                "60", "5", Visibility.GROUPS, List.of(), 0L, null);

        Exercise entity = ExerciseMapper.toEntity(dto, "alice");

        assertEquals("alice", entity.getCreator());
        assertEquals(LocalTime.of(7, 5, 9), entity.getStartTime());
        assertNull(entity.getLastSchedulerRun());
        assertEquals(ID, entity.getExerciseId());
    }

    @Test
    void toEntity_rejectsMalformedTime() {
        ExerciseDto dto = new ExerciseDto(null, "x", null, 1, "7:5", 0, ExerciseType.NUMBERREPEAT,
                "1", null, Visibility.PUBLIC, List.of(), 0L, null);

        assertThrows(java.time.format.DateTimeParseException.class, () -> ExerciseMapper.toEntity(dto, "alice"));
    }
}
