package org.exercise.counter.exercisecounter.web.rest.groups.dto;

/** Body of join / leave / accept: {@code {"groupName": "…"}}. */
public record GroupNameRequest(String groupName) {
}
