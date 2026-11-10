package org.exercise.counter.exercisecounter.web.data.groups;

import java.util.UUID;

/**
 * Projection: number of members (accepted, not just invited) of a group.
 */
public record GroupMemberCount(UUID groupId, long members) {
}
