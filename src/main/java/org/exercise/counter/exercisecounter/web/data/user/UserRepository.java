package org.exercise.counter.exercisecounter.web.data.user;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends CrudRepository<User, String> {
        Optional<User> findByUsername(String username);

        @Query("select u.username from User u order by lower(u.username)")
        List<String> findAllUsernames();

        /** Until the end of the transaction. */
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select u from User u where u.username = :username")
        Optional<User> lock(String username);
}
