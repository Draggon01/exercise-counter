package org.exercise.counter.exercisecounter.web.data.userselection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserSelectionRepository extends JpaRepository<UserSelection, UserSelectionId> {
    List<UserSelection> findByUserSelectionId_Username(String username);
}
