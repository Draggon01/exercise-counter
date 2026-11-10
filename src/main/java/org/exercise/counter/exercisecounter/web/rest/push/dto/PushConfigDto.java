package org.exercise.counter.exercisecounter.web.rest.push.dto;

/** Whether reminders are available on this server and the key browsers subscribe with. */
public record PushConfigDto(boolean enabled, String publicKey) {
}
