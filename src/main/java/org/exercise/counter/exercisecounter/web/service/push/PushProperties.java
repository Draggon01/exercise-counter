package org.exercise.counter.exercisecounter.web.service.push;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

/**
 * Reminders by Web Push ({@code app.push.*}). Without a key pair the feature is off: the app works as
 * before and the options page hides the reminder switch.
 *
 * @param publicKey     VAPID public key (base64url, 65 byte point) – env {@code APP_PUSH_PUBLIC_KEY}
 * @param privateKey    VAPID private key (base64url, 32 bytes) – env {@code APP_PUSH_PRIVATE_KEY}, keep secret
 * @param subject       contact for the push services, {@code mailto:...} or {@code https://...}
 * @param allowedHosts  push services the server sends to (host or parent domain) – nothing else is ever called
 * @param checkInterval how often due reminders are looked for
 */
@ConfigurationProperties("app.push")
public record PushProperties(String publicKey, String privateKey, String subject,
                             List<String> allowedHosts, Duration checkInterval) {

    public PushProperties {
        if (allowedHosts == null || allowedHosts.isEmpty()) {
            allowedHosts = List.of("fcm.googleapis.com", "push.services.mozilla.com", "notify.windows.com",
                    "push.apple.com");
        }
        if (checkInterval == null) {
            checkInterval = Duration.ofMinutes(10);
        }
    }

    public boolean enabled() {
        return publicKey != null && !publicKey.isBlank() && privateKey != null && !privateKey.isBlank();
    }
}
