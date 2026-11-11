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

        assertEquals(new ExerciseDto(ID, "Squats", "alice", 2, "07:05:09", 1, null, ExerciseType.TIMEINCREASE,
                "60", "5", Visibility.GROUPS, List.of("team"), 3600L, 4), dto);
    }

    @Test
    void toEntity_usesGivenCreatorAndResetsLastSchedulerRun() {
        ExerciseDto dto = new ExerciseDto(ID, "Squats", "mallory", 2, "07:05:09", 1, null, ExerciseType.TIMEINCREASE,
                "60", "5", Visibility.GROUPS, List.of(), 0L, null);

        Exercise entity = ExerciseMapper.toEntity(dto, "alice");

        assertEquals("alice", entity.getCreator());
        assertEquals(LocalTime.of(7, 5, 9), entity.getStartTime());
        assertNull(entity.getLastSchedulerRun());
        assertEquals(ID, entity.getExerciseId());
    }

    @Test
    void toEntity_rejectsMalformedTime() {
        ExerciseDto dto = new ExerciseDto(null, "x", null, 1, "7:5", 0, null, ExerciseType.NUMBERREPEAT,
                "1", null, Visibility.PUBLIC, List.of(), 0L, null);

        assertThrows(java.time.format.DateTimeParseException.class, () -> ExerciseMapper.toEntity(dto, "alice"));
    }

    @Test
    void toEntity_keepsAValidTimeZone() {
        ExerciseDto dto = new ExerciseDto(null, "x", null, 1, "20:00:00", 2, "Europe/Vienna", ExerciseType.NUMBERREPEAT,
                "1", null, Visibility.PUBLIC, List.of(), 0L, null);

        Exercise entity = ExerciseMapper.toEntity(dto, "alice");

        assertEquals("Europe/Vienna", entity.getTimeZone());
        assertEquals(java.time.ZoneId.of("Europe/Vienna"), entity.zone());
    }

    @Test
    void toEntity_withoutTimeZone_usesTheOffset() {
        ExerciseDto dto = new ExerciseDto(null, "x", null, 1, "20:00:00", 2, null, ExerciseType.NUMBERREPEAT,
                "1", null, Visibility.PUBLIC, List.of(), 0L, null);

        assertEquals(java.time.ZoneOffset.ofHours(2), ExerciseMapper.toEntity(dto, "alice").zone());
    }

    @Test
    void toEntity_rejectsUnknownTimeZones() {
        ExerciseDto dto = new ExerciseDto(null, "x", null, 1, "20:00:00", 2, "Mars/Olympus", ExerciseType.NUMBERREPEAT,
                "1", null, Visibility.PUBLIC, List.of(), 0L, null);

        var error = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> ExerciseMapper.toEntity(dto, "alice"));
        assertEquals(400, error.getStatusCode().value());
    }
}
