package org.exercise.counter.exercisecounter.web.rest.media;

import org.exercise.counter.exercisecounter.web.rest.media.dto.MediaConfigDto;
import org.exercise.counter.exercisecounter.web.rest.media.dto.MediaDto;
import org.exercise.counter.exercisecounter.web.rest.media.dto.MediaUsageDto;
import org.exercise.counter.exercisecounter.web.service.media.MediaFile;
import org.exercise.counter.exercisecounter.web.service.media.MediaService;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.UUID;

/** Videos and photos of steps. */
@RestController
@RequestMapping("/api")
public class MediaController {

    /** A new upload gets a new id, so a file never changes. */
    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofDays(365)).cachePrivate().immutable();

    private final MediaService mediaService;

    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @PutMapping(path = "/exercises/{exerciseId}/steps/{stepId}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    public MediaDto upload(@PathVariable UUID exerciseId, @PathVariable UUID stepId, @RequestParam MultipartFile file,
                           @AuthenticationPrincipal UserDetails user) {
        return mediaService.upload(exerciseId, stepId, file, user.getUsername());
    }

    @DeleteMapping("/exercises/{exerciseId}/steps/{stepId}/media")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID exerciseId, @PathVariable UUID stepId, @AuthenticationPrincipal UserDetails user) {
        mediaService.delete(exerciseId, stepId, user.getUsername());
    }

    @GetMapping("/media/config")
    public MediaConfigDto config() {
        return mediaService.config();
    }

    @GetMapping("/media/usage")
    public MediaUsageDto usage(@AuthenticationPrincipal UserDetails user) {
        return mediaService.usage(user.getUsername());
    }

    /** The video (also parts of it, Safari needs range requests) or the photo. */
    @GetMapping("/media/{mediaId}")
    public ResponseEntity<Resource> file(@PathVariable UUID mediaId, @AuthenticationPrincipal UserDetails user) {
        return respond(mediaId, mediaService.mainFile(mediaId), user);
    }

    /** Preview of a video. */
    @GetMapping("/media/{mediaId}/poster")
    public ResponseEntity<Resource> poster(@PathVariable UUID mediaId, @AuthenticationPrincipal UserDetails user) {
        return respond(mediaId, MediaFile.IMAGE, user);
    }

    private ResponseEntity<Resource> respond(UUID mediaId, MediaFile file, UserDetails user) {
        return ResponseEntity.ok()
                .cacheControl(CACHE)
                .contentType(MediaType.parseMediaType(file.contentType()))
                .body(mediaService.open(mediaId, file, user.getUsername()));
    }
}
