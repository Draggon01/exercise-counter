package org.exercise.counter.exercisecounter.web.data.user;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends CrudRepository<User, String> {
        Optional<User> findByUsername(String username);

        @Query("select u.username from User u order by lower(u.username)")
        List<String> findAllUsernames();
}
