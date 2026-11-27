package org.exercise.counter.exercisecounter.web.rest.groups.dto;

import java.util.List;

/**
 * Who is in a group: members and people invited but not joined yet, each sorted by name.
 */
public record GroupMembersDto(List<String> members, List<String> invited) {
}
