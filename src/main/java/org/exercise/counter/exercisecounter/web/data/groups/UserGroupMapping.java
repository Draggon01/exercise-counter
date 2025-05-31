package org.exercise.counter.exercisecounter.web.data.groups;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity(name = "user_group_mapping")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserGroupMapping {
    @EmbeddedId
    UserGroupMappingId userGroupMappingId;

    @ManyToOne
    @JoinColumn(name = "group_id", insertable = false, updatable = false)
    Group group;

    @Column
    Boolean isInvited;

    public UserGroupMapping(String username, UUID groupId) {
        this.userGroupMappingId = new UserGroupMappingId(username, groupId);
        this.isInvited = false;
    }
}
