package org.exercise.counter.exercisecounter.web.rest.changelog;

import org.exercise.counter.exercisecounter.web.rest.changelog.dto.ChangelogEntry;
import org.exercise.counter.exercisecounter.web.service.ChangelogService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/changelog")
public class ChangelogController {

    private final ChangelogService changelogService;

    public ChangelogController(ChangelogService changelogService) {
        this.changelogService = changelogService;
    }

    /** The whole changelog, newest first. */
    @GetMapping
    public List<ChangelogEntry> all() {
        return changelogService.all();
    }

    /** Entries the current user has not seen yet (empty if none). */
    @GetMapping("/unseen")
    public List<ChangelogEntry> unseen(@AuthenticationPrincipal UserDetails user) {
        return changelogService.unseen(user.getUsername());
    }

    @PutMapping("/seen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markSeen(@AuthenticationPrincipal UserDetails user) {
        changelogService.markSeen(user.getUsername());
    }
}
