package org.exercise.counter.exercisecounter.web.data.groups;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserGroupMappingId implements Serializable {
    private String username;
    @Column(name = "group_id")
    private UUID groupId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserGroupMappingId that = (UserGroupMappingId) o;
        return username.equals(that.username) && groupId.equals(that.groupId);
    }

    @Override
    public int hashCode() {
        return 31 * username.hashCode() + groupId.hashCode();
    }
}
