package org.exercise.counter.exercisecounter.web.rest.account.dto;

import java.time.Instant;

/** The link to hand to the user (shown once – only its hash is stored). */
public record PasswordResetLinkDto(String link, String username, Instant expiresAt) {
}
