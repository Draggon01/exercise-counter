package org.exercise.counter.exercisecounter.web.data.register;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RegisterRepository extends JpaRepository<Register, UUID> {
    List<Register> findByIssuer(String issuer);
}
