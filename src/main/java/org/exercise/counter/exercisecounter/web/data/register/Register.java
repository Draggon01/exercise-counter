package org.exercise.counter.exercisecounter.web.data.register;

import jakarta.persistence.*;

import java.util.UUID;
import java.util.Objects;

@Entity(name = "register")
public class Register {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column
    private UUID registerId;

    @Column
    private String issuer;

    public Register() {
    }

    public Register(UUID registerId, String issuer) {
        this.registerId = registerId;
        this.issuer = issuer;
    }

    public UUID getRegisterId() {
        return this.registerId;
    }

    public String getIssuer() {
        return this.issuer;
    }

    public void setRegisterId(UUID registerId) {
        this.registerId = registerId;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Register other)) return false;
        return Objects.equals(getRegisterId(), other.getRegisterId()) &&
                Objects.equals(getIssuer(), other.getIssuer());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getRegisterId(), getIssuer());
    }

    @Override
    public String toString() {
        return "Register(registerId=" + this.getRegisterId() + ", issuer=" + this.getIssuer() + ")";
    }
}
