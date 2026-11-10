package org.exercise.counter.exercisecounter.web.service.push;

import java.net.URI;
import java.util.List;
import java.util.Locale;

/** Which subscription endpoints the server may call (only HTTPS push services – no requests to anything else). */
public final class PushEndpoints {

    private PushEndpoints() {
    }

    public static boolean isAllowed(URI endpoint, List<String> allowedHosts) {
        if (endpoint == null || !"https".equalsIgnoreCase(endpoint.getScheme()) || endpoint.getHost() == null
                || endpoint.getUserInfo() != null || (endpoint.getPort() != -1 && endpoint.getPort() != 443)) {
            return false;
        }
        String host = endpoint.getHost().toLowerCase(Locale.ROOT);
        return allowedHosts.stream()
                .map(allowed -> allowed.toLowerCase(Locale.ROOT))
                .anyMatch(allowed -> host.equals(allowed) || host.endsWith("." + allowed));
    }

    public static boolean isAllowed(String endpoint, List<String> allowedHosts) {
        try {
            return isAllowed(URI.create(endpoint), allowedHosts);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
