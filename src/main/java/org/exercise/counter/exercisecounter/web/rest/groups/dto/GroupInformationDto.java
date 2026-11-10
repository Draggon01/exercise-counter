package org.exercise.counter.exercisecounter.web.rest.groups.dto;

import org.exercise.counter.exercisecounter.web.data.groups.GroupVisibility;

public record GroupInformationDto(
        String groupName,
        Boolean isInvited,
        GroupVisibility visibility,
        /* members of the group, pending invitations not counted */
        long memberCount
) {
}
