package org.exercise.counter.exercisecounter.web.data.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;

/** A one-time link to set a new password (only the token's hash is stored). Times in UTC. */
@Entity
@Table(name = "password_reset")
public class PasswordReset {

    @Id
    @Column(name = "token_hash", length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private String username;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    public PasswordReset() {
    }

    public PasswordReset(String tokenHash, String username, String createdBy, LocalDateTime createdAt, LocalDateTime expiresAt) {
        this.tokenHash = tokenHash;
        this.username = username;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public String getUsername() {
        return username;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof PasswordReset other && Objects.equals(tokenHash, other.tokenHash));
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(tokenHash);
    }

    @Override
    public String toString() {
        return "PasswordReset(username=" + username + ", createdBy=" + createdBy + ", expiresAt=" + expiresAt + ")";
    }
}
