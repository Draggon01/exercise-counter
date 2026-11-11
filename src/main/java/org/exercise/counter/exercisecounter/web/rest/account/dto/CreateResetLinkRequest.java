package org.exercise.counter.exercisecounter.web.rest.account.dto;

/**
 * @param baseUrl origin of the frontend the link points to (window.location.origin)
 */
public record CreateResetLinkRequest(String username, String baseUrl) {
}
