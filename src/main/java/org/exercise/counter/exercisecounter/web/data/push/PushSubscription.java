package org.exercise.counter.exercisecounter.web.data.push;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;

/** A browser / installed app that receives reminders (Web Push subscription of one device). */
@Entity
@Table(name = "push_subscription")
public class PushSubscription {

    /** URL of the browser's push service for this device – unique per subscription. */
    @Id
    @Column(length = 2048)
    private String endpoint;

    @Column(nullable = false)
    private String username;

    /** The browser's public key (base64url) the message is encrypted for. */
    @Column(nullable = false)
    private String p256dh;

    /** The browser's auth secret (base64url). */
    @Column(nullable = false)
    private String auth;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public PushSubscription() {
    }

    public PushSubscription(String endpoint, String username, String p256dh, String auth, LocalDateTime createdAt) {
        this.endpoint = endpoint;
        this.username = username;
        this.p256dh = p256dh;
        this.auth = auth;
        this.createdAt = createdAt;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getP256dh() {
        return p256dh;
    }

    public void setP256dh(String p256dh) {
        this.p256dh = p256dh;
    }

    public String getAuth() {
        return auth;
    }

    public void setAuth(String auth) {
        this.auth = auth;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof PushSubscription other && Objects.equals(endpoint, other.endpoint));
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(endpoint);
    }

    @Override
    public String toString() {
        // the endpoint and keys identify the device – not written to logs
        return "PushSubscription(username=" + username + ", createdAt=" + createdAt + ")";
    }
}
