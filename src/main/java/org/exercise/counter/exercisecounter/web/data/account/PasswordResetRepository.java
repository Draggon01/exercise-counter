package org.exercise.counter.exercisecounter.web.data.account;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface PasswordResetRepository extends JpaRepository<PasswordReset, String> {

    /** A new link replaces older ones of the same user. */
    @Modifying
    @Query("delete from PasswordReset r where r.username = :username")
    void deleteByUsername(@Param("username") String username);

    @Modifying
    @Query("delete from PasswordReset r where r.expiresAt < :now")
    void deleteExpired(@Param("now") LocalDateTime now);
}
