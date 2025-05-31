package org.exercise.counter.exercisecounter.web.rest.groups.dto;

import java.util.List;

public record UserGroupMappingDto(
        String username,
        List<GroupInformationDto> groupInformation
) {
}
