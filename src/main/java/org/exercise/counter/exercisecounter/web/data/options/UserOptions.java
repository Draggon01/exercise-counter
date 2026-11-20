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

    /** No reminders from quietFrom to quietUntil (full hours in {@link #timeZone}) when turned on. */
    @Column(name = "quiet_hours", nullable = false)
    private boolean quietHours;

    @Column(name = "quiet_from", nullable = false)
    private int quietFrom = 22;

    @Column(name = "quiet_until", nullable = false)
    private int quietUntil = 7;

    /** IANA zone of the user's browser (sent with the quiet hours), null = UTC. */
    @Column(name = "time_zone")
    private String timeZone;

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

    public boolean isQuietHours() {
        return quietHours;
    }

    public void setQuietHours(boolean quietHours) {
        this.quietHours = quietHours;
    }

    public int getQuietFrom() {
        return quietFrom;
    }

    public void setQuietFrom(int quietFrom) {
        this.quietFrom = quietFrom;
    }

    public int getQuietUntil() {
        return quietUntil;
    }

    public void setQuietUntil(int quietUntil) {
        this.quietUntil = quietUntil;
    }

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserOptions other)) return false;
        return Objects.equals(isAutoCollapse(), other.isAutoCollapse()) &&
                Objects.equals(getUsername(), other.getUsername()) &&
                Objects.equals(getLastSeenChangelog(), other.getLastSeenChangelog()) &&
                getReminderHours() == other.getReminderHours() &&
                isQuietHours() == other.isQuietHours() &&
                getQuietFrom() == other.getQuietFrom() &&
                getQuietUntil() == other.getQuietUntil() &&
                Objects.equals(getTimeZone(), other.getTimeZone());
    }

    @Override
    public int hashCode() {
        return Objects.hash(isAutoCollapse(), getUsername(), getLastSeenChangelog(), getReminderHours(),
                isQuietHours(), getQuietFrom(), getQuietUntil(), getTimeZone());
    }

    @Override
    public String toString() {
        return "UserOptions(username=" + this.getUsername() + ", autoCollapse=" + this.isAutoCollapse() + ", lastSeenChangelog=" + this.getLastSeenChangelog() + ", reminderHours=" + this.getReminderHours() +
                ", quietHours=" + this.isQuietHours() + " " + this.getQuietFrom() + "-" + this.getQuietUntil() +
                ", timeZone=" + this.getTimeZone() + ")";
    }
}
