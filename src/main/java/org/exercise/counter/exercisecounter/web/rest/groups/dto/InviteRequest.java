package org.exercise.counter.exercisecounter.web.rest.groups.dto;

/** Invite {@code username} to {@code groupName}. */
public record InviteRequest(String username, String groupName) {
}
