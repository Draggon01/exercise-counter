package org.exercise.counter.exercisecounter.web.service.push;

import org.exercise.counter.exercisecounter.web.data.push.PushSubscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.PrivateKey;
import java.time.Clock;
import java.time.Duration;
import java.util.Map;

/**
 * Sends Web Push messages: encrypts the payload for the device (RFC 8291) and authenticates the
 * server with a VAPID token (RFC 8292). Only push services from {@code app.push.allowed-hosts} are called.
 */
@Component
public class WebPushSender implements PushSender {

    private static final Logger log = LoggerFactory.getLogger(WebPushSender.class);
    /** Push services keep an undelivered reminder this long (the phone may be offline). */
    private static final Duration TIME_TO_LIVE = Duration.ofHours(6);

    private final PushProperties properties;
    private final JsonMapper jsonMapper;
    private final Clock clock;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public WebPushSender(PushProperties properties, JsonMapper jsonMapper, Clock clock) {
        this.properties = properties;
        this.jsonMapper = jsonMapper;
        this.clock = clock;
    }

    @Override
    public Result send(PushSubscription subscription, PushMessage message) {
        if (!properties.enabled()) {
            return Result.FAILED;
        }
        URI endpoint = URI.create(subscription.getEndpoint());
        if (!PushEndpoints.isAllowed(endpoint, properties.allowedHosts())) {
            log.warn("Push endpoint host {} is not allowed – subscription dropped", endpoint.getHost());
            return Result.GONE;
        }
        try {
            byte[] body = WebPushCrypto.encrypt(jsonMapper.writeValueAsBytes(message),
                    subscription.getP256dh(), subscription.getAuth());
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "vapid t=" + vapidToken(endpoint) + ", k=" + properties.publicKey())
                    .header("Content-Encoding", "aes128gcm")
                    .header("Content-Type", "application/octet-stream")
                    .header("TTL", String.valueOf(TIME_TO_LIVE.toSeconds()))
                    .header("Urgency", "normal")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status >= 200 && status < 300) {
                return Result.SENT;
            }
            if (status == 404 || status == 410) {
                return Result.GONE;
            }
            log.warn("Push service {} answered {}: {}", endpoint.getHost(), status, abbreviate(response.body()));
            return Result.FAILED;
        } catch (IOException | IllegalArgumentException e) {
            log.warn("Push to {} failed: {}", endpoint.getHost(), e.getMessage());
            return Result.FAILED;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Result.FAILED;
        }
    }

    /** JWT signed with the VAPID private key, valid for 12 hours, for the push service's origin. */
    String vapidToken(URI endpoint) {
        String audience = endpoint.getScheme() + "://" + endpoint.getAuthority();
        long expires = clock.instant().plus(Duration.ofHours(12)).getEpochSecond();
        String header = base64Json(Map.of("typ", "JWT", "alg", "ES256"));
        String claims = base64Json(Map.of("aud", audience, "exp", expires, "sub", properties.subject()));
        String unsigned = header + "." + claims;
        PrivateKey key = WebPushCrypto.privateKey(WebPushCrypto.decode(properties.privateKey()));
        return unsigned + "." + WebPushCrypto.encode(WebPushCrypto.sign(unsigned.getBytes(StandardCharsets.US_ASCII), key));
    }

    private String base64Json(Map<String, Object> value) {
        return WebPushCrypto.encode(jsonMapper.writeValueAsBytes(value));
    }

    private static String abbreviate(String text) {
        return text == null || text.length() <= 200 ? text : text.substring(0, 200) + "…";
    }
}
