package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.detail.ExerciseDetail;
import org.exercise.counter.exercisecounter.web.data.detail.ExerciseDetailRepository;
import org.exercise.counter.exercisecounter.web.data.detail.ExerciseStep;
import org.exercise.counter.exercisecounter.web.data.detail.ExerciseStepRepository;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseDetailsDto;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseDetailsRequest;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseStepDto;
import org.exercise.counter.exercisecounter.web.rest.detail.dto.ExerciseStepRequest;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Description and steps of an exercise (plain text). Independent of the exercise's own row: changes never touch
 * its schedule.
 */
@Service
public class ExerciseDetailService {

    public static final int MAX_DESCRIPTION = 2000;
    public static final int MAX_TITLE = 80;
    public static final int MAX_HINTS = 500;
    public static final int MAX_STEPS = 12;

    private final ExerciseDetailRepository detailRepository;
    private final ExerciseStepRepository stepRepository;
    private final ExerciseAccess exerciseAccess;

    public ExerciseDetailService(ExerciseDetailRepository detailRepository, ExerciseStepRepository stepRepository,
                                 ExerciseAccess exerciseAccess) {
        this.detailRepository = detailRepository;
        this.stepRepository = stepRepository;
        this.exerciseAccess = exerciseAccess;
    }

    @Transactional(readOnly = true)
    public ExerciseDetailsDto load(UUID exerciseId, String username) {
        exerciseAccess.requireVisible(exerciseId, username);
        return details(exerciseId);
    }

    @Transactional
    public ExerciseDetailsDto update(UUID exerciseId, ExerciseDetailsRequest request, String username) {
        exerciseAccess.requireCreator(exerciseId, username);
        ExerciseDetail detail = detailRepository.findById(exerciseId).orElseGet(() -> new ExerciseDetail(exerciseId));
        if (request.description() != null) {
            detail.setDescription(text("The description", request.description(), MAX_DESCRIPTION));
        }
        if (request.guidedMode() != null) {
            detail.setGuidedMode(request.guidedMode());
        }
        detailRepository.save(detail);
        return details(exerciseId);
    }

    @Transactional
    public ExerciseStepDto addStep(UUID exerciseId, ExerciseStepRequest request, String username) {
        exerciseAccess.requireCreator(exerciseId, username);
        List<ExerciseStep> steps = stepRepository.findByExerciseIdOrderByPosition(exerciseId);
        if (steps.size() >= MAX_STEPS) {
            throw badRequest("An exercise can have up to " + MAX_STEPS + " steps");
        }
        int position = steps.isEmpty() ? 0 : steps.getLast().getPosition() + 1;
        ExerciseStep step = new ExerciseStep(exerciseId, position);
        apply(request, step);
        return toDto(stepRepository.save(step));
    }

    @Transactional
    public ExerciseStepDto updateStep(UUID exerciseId, UUID stepId, ExerciseStepRequest request, String username) {
        exerciseAccess.requireCreator(exerciseId, username);
        ExerciseStep step = requireStep(exerciseId, stepId);
        apply(request, step);
        return toDto(stepRepository.save(step));
    }

    @Transactional
    public void deleteStep(UUID exerciseId, UUID stepId, String username) {
        exerciseAccess.requireCreator(exerciseId, username);
        stepRepository.delete(requireStep(exerciseId, stepId));
    }

    @Transactional
    public ExerciseDetailsDto reorderSteps(UUID exerciseId, List<UUID> stepIds, String username) {
        exerciseAccess.requireCreator(exerciseId, username);
        Map<UUID, ExerciseStep> steps = stepRepository.findByExerciseIdOrderByPosition(exerciseId).stream()
                .collect(Collectors.toMap(ExerciseStep::getStepId, Function.identity()));
        if (stepIds.size() != steps.size() || !steps.keySet().equals(new HashSet<>(stepIds))) {
            throw badRequest("The steps have changed in the meantime – please reload");
        }
        for (int position = 0; position < stepIds.size(); position++) {
            steps.get(stepIds.get(position)).setPosition(position);
        }
        stepRepository.saveAllAndFlush(steps.values());
        return details(exerciseId);
    }

    private ExerciseStep requireStep(UUID exerciseId, UUID stepId) {
        return stepRepository.findByStepIdAndExerciseId(stepId, exerciseId)
                .orElseThrow(() -> new NotFoundException("Step not found"));
    }

    private ExerciseDetailsDto details(UUID exerciseId) {
        ExerciseDetail detail = detailRepository.findById(exerciseId).orElseGet(() -> new ExerciseDetail(exerciseId));
        List<ExerciseStepDto> steps = stepRepository.findByExerciseIdOrderByPosition(exerciseId).stream()
                .map(ExerciseDetailService::toDto)
                .toList();
        return new ExerciseDetailsDto(detail.getDescription(), detail.getGuidedMode(), steps);
    }

    private static void apply(ExerciseStepRequest request, ExerciseStep step) {
        String title = text("The title", request.title(), MAX_TITLE);
        if (title.isEmpty()) {
            throw badRequest("A step needs a title");
        }
        if (request.reps() != null && request.durationSeconds() != null) {
            throw badRequest("A step has repetitions or a duration, not both");
        }
        step.setTitle(title);
        step.setHints(text("The hints", request.hints(), MAX_HINTS));
        step.setSets(inRange("Sets", request.sets(), 1, 99));
        step.setReps(inRange("Repetitions", request.reps(), 1, 999));
        step.setDurationSeconds(inRange("Duration", request.durationSeconds(), 1, 3600));
        step.setRestSeconds(inRange("Rest", request.restSeconds(), 0, 600));
    }

    /** Trimmed, without NUL (PostgreSQL cannot store it); empty if missing. */
    private static String text(String what, String value, int maxLength) {
        String text = value == null ? "" : value.replace("\u0000", "").strip();
        if (text.length() > maxLength) {
            throw badRequest(what + " can have up to " + maxLength + " characters");
        }
        return text;
    }

    private static Integer inRange(String what, Integer value, int min, int max) {
        if (value != null && (value < min || value > max)) {
            throw badRequest(what + ": " + min + " to " + max);
        }
        return value;
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ExerciseStepDto toDto(ExerciseStep step) {
        return new ExerciseStepDto(step.getStepId(), step.getTitle(), step.getHints(), step.getSets(), step.getReps(),
                step.getDurationSeconds(), step.getRestSeconds());
    }
}
