package org.exercise.counter.exercisecounter.web.data.checks;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity(name = "checks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Check {
    @EmbeddedId
    CheckId checkId;
}
