package org.exercise.counter.exercisecounter.web.data.groups;

import jakarta.persistence.*;

import java.util.UUID;
import java.util.Objects;

@Entity(name = "groups")
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column
    UUID groupId;

    @Column
    String groupName;

    @Column(name = "group_visibility", nullable = false)
    @Enumerated(EnumType.STRING)
    GroupVisibility visibility = GroupVisibility.INVITE_ONLY;

    public Group() {
    }

    public Group(UUID groupId, String groupName, GroupVisibility visibility) {
        this.groupId = groupId;
        this.groupName = groupName;
        this.visibility = visibility;
    }

    public UUID getGroupId() {
        return this.groupId;
    }

    public String getGroupName() {
        return this.groupName;
    }

    public GroupVisibility getVisibility() {
        return this.visibility;
    }

    public void setGroupId(UUID groupId) {
        this.groupId = groupId;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public void setVisibility(GroupVisibility visibility) {
        this.visibility = visibility;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Group other)) return false;
        return Objects.equals(getGroupId(), other.getGroupId()) &&
                Objects.equals(getGroupName(), other.getGroupName()) &&
                Objects.equals(getVisibility(), other.getVisibility());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getGroupId(), getGroupName(), getVisibility());
    }

    @Override
    public String toString() {
        return "Group(groupId=" + this.getGroupId() + ", groupName=" + this.getGroupName() + ", visibility=" + this.getVisibility() + ")";
    }
}
