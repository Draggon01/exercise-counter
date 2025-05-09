package org.exercise.counter.exercisecounter.web.data.checks;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckId implements Serializable {

    private UUID exerciseId;
    private String username;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CheckId checkId = (CheckId) o;
        return exerciseId.equals(checkId.exerciseId) && username.equals(checkId.username);
    }

    @Override
    public int hashCode() {
        return 31 * exerciseId.hashCode() + username.hashCode();
    }
}
