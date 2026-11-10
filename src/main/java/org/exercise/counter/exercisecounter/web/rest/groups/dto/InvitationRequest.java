package org.exercise.counter.exercisecounter.web.rest.groups.dto;

/** Body of {@code POST /api/groups/{groupName}/invitations}: who to invite. */
public record InvitationRequest(String username) {
}
