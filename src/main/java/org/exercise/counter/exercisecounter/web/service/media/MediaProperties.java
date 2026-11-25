package org.exercise.counter.exercisecounter.web.service.media;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import java.time.Duration;

/**
 * Videos and photos of steps ({@code app.media.*}). Without a directory the feature is off.
 *
 * @param dir            where the files are kept – env {@code APP_MEDIA_DIR}
 * @param ffmpeg         command or path
 * @param ffprobe        command or path
 * @param videoEncoder   H.264 encoder of that ffmpeg (Fedora's has only {@code libopenh264})
 * @param maxVideoUpload raw video (Cloudflare's free plan stops at 100 MB)
 * @param maxPhotoUpload raw photo
 * @param maxFile        finished file
 * @param userQuota      finished files of all exercises of a user
 * @param maxDuration    of a video
 * @param videoSize      longest side in pixels
 * @param videoKbit      video bitrate in kbit/s
 * @param photoSize      longest side in pixels
 * @param timeout        of one ffmpeg run
 */
@ConfigurationProperties("app.media")
public record MediaProperties(String dir, String ffmpeg, String ffprobe, String videoEncoder,
                              DataSize maxVideoUpload, DataSize maxPhotoUpload, DataSize maxFile, DataSize userQuota,
                              Duration maxDuration, Integer videoSize, Integer videoKbit, Integer photoSize,
                              Duration timeout) {

    public MediaProperties {
        ffmpeg = orDefault(ffmpeg, "ffmpeg");
        ffprobe = orDefault(ffprobe, "ffprobe");
        videoEncoder = orDefault(videoEncoder, "libx264");
        maxVideoUpload = maxVideoUpload == null ? DataSize.ofMegabytes(90) : maxVideoUpload;
        maxPhotoUpload = maxPhotoUpload == null ? DataSize.ofMegabytes(20) : maxPhotoUpload;
        maxFile = maxFile == null ? DataSize.ofMegabytes(2) : maxFile;
        userQuota = userQuota == null ? DataSize.ofMegabytes(50) : userQuota;
        maxDuration = maxDuration == null ? Duration.ofSeconds(15) : maxDuration;
        videoSize = videoSize == null ? 640 : videoSize;
        videoKbit = videoKbit == null ? 800 : videoKbit;
        photoSize = photoSize == null ? 1280 : photoSize;
        timeout = timeout == null ? Duration.ofMinutes(3) : timeout;
    }

    public boolean enabled() {
        return dir != null && !dir.isBlank();
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
