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

    /** Version of the newest changelog entry the user has seen, null if none. */
    @Column(name = "last_seen_changelog")
    private String lastSeenChangelog;

    /** Unfinished exercises are reminded this many hours before their reset (if a device is subscribed). */
    @Column(name = "reminder_hours", nullable = false)
    private int reminderHours = DEFAULT_REMINDER_HOURS;

    public static final int DEFAULT_REMINDER_HOURS = 3;

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

    public String getLastSeenChangelog() {
        return this.lastSeenChangelog;
    }

    public void setLastSeenChangelog(String lastSeenChangelog) {
        this.lastSeenChangelog = lastSeenChangelog;
    }

    public int getReminderHours() {
        return this.reminderHours;
    }

    public void setReminderHours(int reminderHours) {
        this.reminderHours = reminderHours;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserOptions other)) return false;
        return Objects.equals(isAutoCollapse(), other.isAutoCollapse()) &&
                Objects.equals(getUsername(), other.getUsername()) &&
                Objects.equals(getLastSeenChangelog(), other.getLastSeenChangelog()) &&
                getReminderHours() == other.getReminderHours();
    }

    @Override
    public int hashCode() {
        return Objects.hash(isAutoCollapse(), getUsername(), getLastSeenChangelog(), getReminderHours());
    }

    @Override
    public String toString() {
        return "UserOptions(username=" + this.getUsername() + ", autoCollapse=" + this.isAutoCollapse() + ", lastSeenChangelog=" + this.getLastSeenChangelog() + ", reminderHours=" + this.getReminderHours() + ")";
    }
}
