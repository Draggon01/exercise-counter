package org.exercise.counter.exercisecounter.web.rest.options;

import org.exercise.counter.exercisecounter.web.data.options.UserOptions;
import org.exercise.counter.exercisecounter.web.data.options.UserOptionsRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import org.exercise.counter.exercisecounter.web.service.push.QuietHours;

import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.Set;

@RestController
@RequestMapping("/api/options")
public class OptionsController {

    private final UserOptionsRepository userOptionsRepository;

    public OptionsController(UserOptionsRepository userOptionsRepository) {
        this.userOptionsRepository = userOptionsRepository;
    }

    /** Hours before the reset a reminder can be sent. */
    static final Set<Integer> REMINDER_HOURS = Set.of(1, 2, 3, 6, 12);

    /** A PUT only changes the fields that are set (null = keep). */
    public record OptionsDto(Boolean autoCollapse, Integer reminderHours,
                             Boolean quietHours, Integer quietFrom, Integer quietUntil, String timeZone) {}

    @GetMapping
    public OptionsDto getOptions(@AuthenticationPrincipal UserDetails user) {
        String username = user.getUsername();
        UserOptions options = userOptionsRepository.findById(username)
                .orElseGet(() -> userOptionsRepository.save(new UserOptions(username, true)));
        return toDto(options);
    }

    @PutMapping
    public OptionsDto saveOptions(@RequestBody OptionsDto dto, @AuthenticationPrincipal UserDetails user) {
        String username = user.getUsername();
        UserOptions options = userOptionsRepository.findById(username)
                .orElse(new UserOptions(username, true));
        if (dto.autoCollapse() != null) {
            options.setAutoCollapse(dto.autoCollapse());
        }
        if (dto.reminderHours() != null) {
            if (!REMINDER_HOURS.contains(dto.reminderHours())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reminders can be sent 1, 2, 3, 6 or 12 hours before the reset");
            }
            options.setReminderHours(dto.reminderHours());
        }
        applyQuietHours(dto, options);
        userOptionsRepository.save(options);
        return toDto(options);
    }

    private static void applyQuietHours(OptionsDto dto, UserOptions options) {
        for (Integer hour : new Integer[]{dto.quietFrom(), dto.quietUntil()}) {
            if (hour != null && !QuietHours.isValidHour(hour)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quiet hours go from 0 to 23");
            }
        }
        if (dto.timeZone() != null) {
            try {
                options.setTimeZone(ZoneId.of(dto.timeZone()).getId());
            } catch (DateTimeException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown time zone");
            }
        }
        if (dto.quietHours() != null) options.setQuietHours(dto.quietHours());
        if (dto.quietFrom() != null) options.setQuietFrom(dto.quietFrom());
        if (dto.quietUntil() != null) options.setQuietUntil(dto.quietUntil());
        if (options.getQuietFrom() == options.getQuietUntil()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quiet hours must start and end at different times");
        }
    }

    private static OptionsDto toDto(UserOptions options) {
        return new OptionsDto(options.isAutoCollapse(), options.getReminderHours(), options.isQuietHours(),
                options.getQuietFrom(), options.getQuietUntil(), options.getTimeZone());
    }
}
