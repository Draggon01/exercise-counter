package org.exercise.counter.exercisecounter.web.data.options;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;

@Entity
@Table(name = "options")
public class UserOptions {

    @Id
    @Column
    private String username;

    @Column(nullable = false)
    private boolean autoCollapse = true;

    public UserOptions() {
    }

    public UserOptions(String username, boolean autoCollapse) {
        this.username = username;
        this.autoCollapse = autoCollapse;
    }

    public String getUsername() {
        return this.username;
    }

    public boolean isAutoCollapse() {
        return this.autoCollapse;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setAutoCollapse(boolean autoCollapse) {
        this.autoCollapse = autoCollapse;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserOptions other)) return false;
        return Objects.equals(isAutoCollapse(), other.isAutoCollapse()) &&
                Objects.equals(getUsername(), other.getUsername());
    }

    @Override
    public int hashCode() {
        return Objects.hash(isAutoCollapse(), getUsername());
    }

    @Override
    public String toString() {
        return "UserOptions(username=" + this.getUsername() + ", autoCollapse=" + this.isAutoCollapse() + ")";
    }
}
