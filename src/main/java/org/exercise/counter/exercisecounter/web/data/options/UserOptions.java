package org.exercise.counter.exercisecounter.web.data.options;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "options")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserOptions {

    @Id
    @Column
    private String username;

    @Column(nullable = false)
    private boolean autoCollapse = true;
}
