package org.exercise.counter.exercisecounter.web.rest.groups.dto;

import org.exercise.counter.exercisecounter.web.data.groups.GroupVisibility;

public record CreateGroupRequestDto(String groupName, GroupVisibility visibility) {
}
