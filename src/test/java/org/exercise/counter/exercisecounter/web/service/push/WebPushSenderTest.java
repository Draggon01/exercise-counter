package org.exercise.counter.exercisecounter.web.service.push;

import org.exercise.counter.exercisecounter.web.data.push.PushSubscription;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** The VAPID token (RFC 8292) the push services check, and what the sender refuses to call. */
class WebPushSenderTest {

    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");
    private final JsonMapper json = JsonMapper.builder().build();
    private final KeyPair vapid = WebPushCrypto.generateKeyPair();
    private final PushProperties properties = new PushProperties(
            WebPushCrypto.encode(WebPushCrypto.encodePoint((ECPublicKey) vapid.getPublic())),
            WebPushCrypto.encode(WebPushCrypto.encodePrivate(vapid.getPrivate())),
            "mailto:admin@example.com", null, null);
    private final WebPushSender sender = new WebPushSender(properties, json, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void vapidToken_isAnEs256JwtForThePushServiceOrigin() throws Exception {
        String token = sender.vapidToken(URI.create("https://fcm.googleapis.com/fcm/send/abc"));

        String[] parts = token.split("\\.");
        assertEquals(3, parts.length);
        JsonNode header = json.readTree(WebPushCrypto.decode(parts[0]));
        JsonNode claims = json.readTree(WebPushCrypto.decode(parts[1]));
        assertEquals("ES256", header.get("alg").asString());
        assertEquals("https://fcm.googleapis.com", claims.get("aud").asString());
        assertEquals("mailto:admin@example.com", claims.get("sub").asString());
        assertEquals(NOW.plusSeconds(12 * 3600).getEpochSecond(), claims.get("exp").asLong());

        Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
        verifier.initVerify(vapid.getPublic());
        verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
        assertTrue(verifier.verify(WebPushCrypto.decode(parts[2])), "signed with the VAPID private key");
    }

    @Test
    void send_neverCallsHostsOutsideTheAllowList() {
        PushSubscription internal = new PushSubscription("https://localhost/push", "anna", "k", "a", LocalDateTime.now());

        assertEquals(PushSender.Result.GONE, sender.send(internal, ReminderMessages.test()));
    }

    @Test
    void send_withoutKeys_doesNothing() {
        WebPushSender off = new WebPushSender(new PushProperties(null, null, null, List.of(), null), json, Clock.systemUTC());
        PushSubscription device = new PushSubscription("https://fcm.googleapis.com/x", "anna", "k", "a", LocalDateTime.now());

        assertEquals(PushSender.Result.FAILED, off.send(device, ReminderMessages.test()));
    }
}
