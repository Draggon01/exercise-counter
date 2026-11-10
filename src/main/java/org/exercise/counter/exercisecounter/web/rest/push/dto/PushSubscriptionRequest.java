package org.exercise.counter.exercisecounter.web.rest.push.dto;

/** A browser's push subscription ({@code PushSubscription.toJSON()}: endpoint + keys). */
public record PushSubscriptionRequest(String endpoint, Keys keys) {

    public record Keys(String p256dh, String auth) {
    }
}
