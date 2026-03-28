package org.exercise.counter.exercisecounter.web.data.groups;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity(name = "groups")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column
    UUID groupId;

    @Column
    String groupName;

    @Column
    @Enumerated(EnumType.STRING)
    GroupVisibility visibility = GroupVisibility.INVITE_ONLY;
}
