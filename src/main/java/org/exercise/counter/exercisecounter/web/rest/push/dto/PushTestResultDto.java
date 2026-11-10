package org.exercise.counter.exercisecounter.web.rest.push.dto;

/** How many of the user's devices got the test notification. */
public record PushTestResultDto(int delivered) {
}
