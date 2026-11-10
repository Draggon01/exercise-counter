package org.exercise.counter.exercisecounter.web.data.push;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PushReminderRepository extends JpaRepository<PushReminder, PushReminderId> {

    List<PushReminder> findByIdUsernameIn(Collection<String> usernames);

    /** A new period starts: everyone can be reminded again. */
    @Modifying
    @Query("delete from PushReminder r where r.id.exerciseId = :exerciseId")
    void deleteByExerciseId(@Param("exerciseId") UUID exerciseId);
}
