package org.exercise.counter.exercisecounter.web.service.push;

import org.exercise.counter.exercisecounter.web.data.push.PushSubscription;

/** Delivers one message to one device (tests replace it with a recording fake). */
public interface PushSender {

    enum Result {
        SENT,
        /** The subscription no longer exists (app uninstalled, permission revoked) – delete it. */
        GONE,
        FAILED
    }

    Result send(PushSubscription subscription, PushMessage message);
}
