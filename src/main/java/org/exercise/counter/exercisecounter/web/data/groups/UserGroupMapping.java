package org.exercise.counter.exercisecounter.web.data.groups;

import jakarta.persistence.*;

import java.util.UUID;
import java.util.Objects;

@Entity(name = "user_group_mapping")
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

    public UserGroupMapping() {
    }

    public UserGroupMapping(UserGroupMappingId userGroupMappingId, Group group, Boolean isInvited) {
        this.userGroupMappingId = userGroupMappingId;
        this.group = group;
        this.isInvited = isInvited;
    }

    public UserGroupMappingId getUserGroupMappingId() {
        return this.userGroupMappingId;
    }

    public Group getGroup() {
        return this.group;
    }

    public Boolean getIsInvited() {
        return this.isInvited;
    }

    public void setUserGroupMappingId(UserGroupMappingId userGroupMappingId) {
        this.userGroupMappingId = userGroupMappingId;
    }

    public void setGroup(Group group) {
        this.group = group;
    }

    public void setIsInvited(Boolean isInvited) {
        this.isInvited = isInvited;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserGroupMapping other)) return false;
        return Objects.equals(getIsInvited(), other.getIsInvited()) &&
                Objects.equals(getUserGroupMappingId(), other.getUserGroupMappingId()) &&
                Objects.equals(getGroup(), other.getGroup());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getIsInvited(), getUserGroupMappingId(), getGroup());
    }

    @Override
    public String toString() {
        return "UserGroupMapping(userGroupMappingId=" + this.getUserGroupMappingId() + ", group=" + this.getGroup() + ", isInvited=" + this.getIsInvited() + ")";
    }
}
