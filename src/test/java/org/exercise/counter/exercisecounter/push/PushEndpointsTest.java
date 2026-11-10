package org.exercise.counter.exercisecounter.push;

import org.exercise.counter.exercisecounter.web.service.push.PushEndpoints;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PushEndpointsTest {

    private static final List<String> ALLOWED = List.of("fcm.googleapis.com", "push.services.mozilla.com",
            "notify.windows.com", "push.apple.com");

    @ParameterizedTest
    @ValueSource(strings = {
            "https://fcm.googleapis.com/fcm/send/abc:def",
            "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
            "https://web.push.apple.com/QGuQyavXut",
            "https://wns2-par02p.notify.windows.com/w/?token=x",
            "https://FCM.googleapis.com:443/fcm/send/x",
    })
    void realPushServicesAreAllowed(String endpoint) {
        assertTrue(PushEndpoints.isAllowed(endpoint, ALLOWED));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://fcm.googleapis.com/fcm/send/x",              // no TLS
            "https://localhost/push",                             // internal
            "https://169.254.169.254/latest/meta-data",           // cloud metadata
            "https://fcm.googleapis.com.evil.example/x",          // look-alike
            "https://evilfcm.googleapis.com.example/x",
            "https://notfcm.googleapis.co/x",
            "https://user@fcm.googleapis.com/x",                  // credentials in the URL
            "https://fcm.googleapis.com:8443/x",                  // other port
            "not a url",
            "",
    })
    void everythingElseIsRejected(String endpoint) {
        assertFalse(PushEndpoints.isAllowed(endpoint, ALLOWED));
    }
}
