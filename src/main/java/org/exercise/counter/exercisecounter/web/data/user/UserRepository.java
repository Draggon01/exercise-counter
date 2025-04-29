package org.exercise.counter.exercisecounter.web.data.user;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;

public interface UserRepository extends CrudRepository<User, String> {
        Optional<User> findByUsername(String username);
}
