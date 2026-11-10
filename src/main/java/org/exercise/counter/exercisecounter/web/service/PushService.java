package org.exercise.counter.exercisecounter.web.service;

import org.exercise.counter.exercisecounter.web.data.push.PushSubscription;
import org.exercise.counter.exercisecounter.web.data.push.PushSubscriptionRepository;
import org.exercise.counter.exercisecounter.web.rest.error.NotFoundException;
import org.exercise.counter.exercisecounter.web.rest.push.dto.PushConfigDto;
import org.exercise.counter.exercisecounter.web.rest.push.dto.PushSubscriptionRequest;
import org.exercise.counter.exercisecounter.web.rest.push.dto.PushTestResultDto;
import org.exercise.counter.exercisecounter.web.service.push.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

/** Devices that receive reminders, and sending to them. */
@Service
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);

    private final PushProperties properties;
    private final PushSubscriptionRepository subscriptionRepository;
    private final PushSender sender;
    private final Clock clock;

    public PushService(PushProperties properties, PushSubscriptionRepository subscriptionRepository,
                       PushSender sender, Clock clock) {
        this.properties = properties;
        this.subscriptionRepository = subscriptionRepository;
        this.sender = sender;
        this.clock = clock;
    }

    public PushConfigDto config() {
        return properties.enabled()
                ? new PushConfigDto(true, properties.publicKey())
                : new PushConfigDto(false, null);
    }

    /** Stores (or refreshes) the device's subscription. A device switching accounts moves to the new user. */
    @Transactional
    public void subscribe(String username, PushSubscriptionRequest request) {
        requireEnabled();
        if (request == null || request.endpoint() == null || request.keys() == null
                || !PushEndpoints.isAllowed(request.endpoint(), properties.allowedHosts())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This browser's push service is not supported");
        }
        String p256dh = request.keys().p256dh();
        String auth = request.keys().auth();
        if (!hasLength(p256dh, 65) || !hasLength(auth, 16)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid push subscription keys");
        }
        PushSubscription subscription = subscriptionRepository.findById(request.endpoint())
                .orElseGet(() -> new PushSubscription(request.endpoint(), username, p256dh, auth,
                        LocalDateTime.now(clock.withZone(ZoneOffset.UTC))));
        subscription.setUsername(username);
        subscription.setP256dh(p256dh);
        subscription.setAuth(auth);
        subscriptionRepository.save(subscription);
    }

    /** Removes the device (only the user's own). */
    @Transactional
    public void unsubscribe(String username, String endpoint) {
        if (endpoint != null && subscriptionRepository.existsByEndpointAndUsername(endpoint, username)) {
            subscriptionRepository.deleteById(endpoint);
        }
    }

    /** "Send test notification" in the options. */
    @Transactional
    public PushTestResultDto sendTest(String username) {
        requireEnabled();
        List<PushSubscription> devices = subscriptionRepository.findByUsername(username);
        if (devices.isEmpty()) {
            throw new NotFoundException("Reminders are not turned on for any of your devices");
        }
        return new PushTestResultDto(send(devices, ReminderMessages.test()));
    }

    /**
     * Sends the message to the devices; subscriptions the push service reports as gone are deleted.
     *
     * @return how many devices got it
     */
    @Transactional
    public int send(List<PushSubscription> devices, PushMessage message) {
        int delivered = 0;
        for (PushSubscription device : devices) {
            switch (sender.send(device, message)) {
                case SENT -> delivered++;
                case GONE -> {
                    log.info("Push subscription of {} is gone – removed", device.getUsername());
                    subscriptionRepository.delete(device);
                }
                case FAILED -> { /* logged by the sender, tried again with the next reminder */ }
            }
        }
        return delivered;
    }

    private void requireEnabled() {
        if (!properties.enabled()) {
            throw new NotFoundException("Reminders are not available on this server");
        }
    }

    private static boolean hasLength(String base64Url, int bytes) {
        try {
            return base64Url != null && WebPushCrypto.decode(base64Url).length == bytes;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
