package org.exercise.counter.exercisecounter.web.rest.push;

import org.exercise.counter.exercisecounter.web.rest.push.dto.PushConfigDto;
import org.exercise.counter.exercisecounter.web.rest.push.dto.PushSubscriptionRequest;
import org.exercise.counter.exercisecounter.web.rest.push.dto.PushTestResultDto;
import org.exercise.counter.exercisecounter.web.service.PushService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/** Reminders by push notification: configuration, devices (subscriptions) and a test message. */
@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushService pushService;

    public PushController(PushService pushService) {
        this.pushService = pushService;
    }

    @GetMapping("/config")
    public PushConfigDto config() {
        return pushService.config();
    }

    @PutMapping("/subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void subscribe(@RequestBody PushSubscriptionRequest request, @AuthenticationPrincipal UserDetails user) {
        pushService.subscribe(user.getUsername(), request);
    }

    /** The endpoint identifies the device (it is a URL, so it goes into the query, not the path). */
    @DeleteMapping("/subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(@RequestParam String endpoint, @AuthenticationPrincipal UserDetails user) {
        pushService.unsubscribe(user.getUsername(), endpoint);
    }

    @PostMapping("/test")
    public PushTestResultDto sendTest(@AuthenticationPrincipal UserDetails user) {
        return pushService.sendTest(user.getUsername());
    }
}
