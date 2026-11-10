package org.exercise.counter.exercisecounter.web.data.groups;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
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

    public UserGroupMappingId() {
    }

    public UserGroupMappingId(String username, UUID groupId) {
        this.username = username;
        this.groupId = groupId;
    }

    public String getUsername() {
        return this.username;
    }

    public UUID getGroupId() {
        return this.groupId;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setGroupId(UUID groupId) {
        this.groupId = groupId;
    }

    @Override
    public String toString() {
        return "UserGroupMappingId(username=" + this.getUsername() + ", groupId=" + this.getGroupId() + ")";
    }
}
