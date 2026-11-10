package org.exercise.counter.exercisecounter.web.data.checks;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;

import java.util.UUID;
import java.util.Objects;

@Entity(name = "checks")
public class Check {
    @EmbeddedId
    CheckId checkId;

    public Check() {
    }

    public Check(CheckId checkId) {
        this.checkId = checkId;
    }

    public CheckId getCheckId() {
        return this.checkId;
    }

    public void setCheckId(CheckId checkId) {
        this.checkId = checkId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Check other)) return false;
        return Objects.equals(getCheckId(), other.getCheckId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getCheckId());
    }

    @Override
    public String toString() {
        return "Check(checkId=" + this.getCheckId() + ")";
    }
}
