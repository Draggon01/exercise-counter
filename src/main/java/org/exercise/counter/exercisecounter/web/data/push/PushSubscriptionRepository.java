package org.exercise.counter.exercisecounter.web.data.push;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, String> {

    List<PushSubscription> findByUsername(String username);

    boolean existsByEndpointAndUsername(String endpoint, String username);
}
