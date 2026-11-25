package org.exercise.counter.exercisecounter.web.service.media;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/** Converts an upload with ffmpeg into the small files that are delivered. */
@Component
public class MediaProcessor {

    private static final Logger log = LoggerFactory.getLogger(MediaProcessor.class);

    private static final Set<String> HDR_TRANSFERS = Set.of("smpte2084", "arib-std-b67");
    private static final String UNREADABLE = "This file could not be read";

    private final MediaProperties properties;
    private final FfmpegCommands commands;
    private final JsonMapper jsonMapper;

    public MediaProcessor(MediaProperties properties, JsonMapper jsonMapper) {
        this.properties = properties;
        this.commands = new FfmpegCommands(properties);
        this.jsonMapper = jsonMapper;
    }

    /** Finished files ({@code video} is null for photos). */
    public record Result(Path video, Path image, Integer durationMs, int width, int height, boolean hasAudio) {

        public long sizeBytes() throws IOException {
            return Files.size(image) + (video == null ? 0 : Files.size(video));
        }
    }

    /** @param folder for the results and everything temporary */
    public Result convert(Path upload, MediaType type, Path folder) throws MediaException, IOException, InterruptedException {
        return switch (type.kind()) {
            case VIDEO -> video(upload, type, folder);
            case PHOTO -> photo(upload, type, folder);
        };
    }

    private Result video(Path upload, MediaType type, Path folder) throws MediaException, IOException, InterruptedException {
        Info source = probe(upload, type, folder);
        if (source.pixels() > FfmpegCommands.MAX_VIDEO_PIXELS) {
            throw new MediaException("The resolution of this video is too high (at most 4K)");
        }
        requireShortEnough(source);
        Path video = folder.resolve("video.mp4");
        boolean small = false;
        for (FfmpegCommands.Attempt attempt : commands.attempts()) {
            run(commands.video(upload, type, attempt, source.hdr(), video), folder, "This video could not be converted");
            if (Files.size(video) <= properties.maxFile().toBytes()) {
                small = true;
                break;
            }
        }
        if (!small) {
            throw new MediaException("This video is too large even after shrinking it – please use a shorter one");
        }
        Info result = probe(video, MediaType.MP4, folder);
        requireShortEnough(result);
        Path poster = folder.resolve("poster.jpg");
        run(commands.poster(video, result.seconds() > 1 ? 0.5 : 0, poster), folder, "This video could not be converted");
        return new Result(video, poster, (int) Math.round(result.seconds() * 1000), result.width(), result.height(), result.audio());
    }

    private Result photo(Path upload, MediaType type, Path folder) throws MediaException, IOException, InterruptedException {
        Info source = probe(upload, type, folder);
        if (source.pixels() > FfmpegCommands.MAX_PHOTO_PIXELS) {
            throw new MediaException("The resolution of this photo is too high");
        }
        Path photo = folder.resolve("photo.jpg");
        run(commands.photo(upload, type, photo), folder, "This photo could not be converted");
        Info result = probe(photo, MediaType.JPEG, folder);
        return new Result(null, photo, null, result.width(), result.height(), false);
    }

    private void requireShortEnough(Info info) throws MediaException {
        // a second more: phones do not stop exactly
        if (info.seconds() > properties.maxDuration().toSeconds() + 1) {
            throw new MediaException("Videos can be up to " + properties.maxDuration().toSeconds() + " seconds long");
        }
    }

    record Info(int width, int height, double seconds, boolean audio, boolean hdr) {
        long pixels() {
            return (long) width * height;
        }
    }

    private Info probe(Path file, MediaType type, Path folder) throws MediaException, IOException, InterruptedException {
        String json = run(commands.probe(file, type), folder, UNREADABLE);
        try {
            return info(jsonMapper.readTree(json));
        } catch (JacksonException e) {
            throw new MediaException(UNREADABLE);
        }
    }

    static Info info(JsonNode json) throws MediaException {
        JsonNode video = null;
        boolean audio = false;
        for (JsonNode stream : json.path("streams")) {
            String kind = stream.path("codec_type").asString("");
            audio |= kind.equals("audio");
            if (video == null && kind.equals("video") && stream.path("disposition").path("attached_pic").asInt(0) == 0) {
                video = stream;
            }
        }
        int width = video == null ? 0 : video.path("width").asInt(0);
        int height = video == null ? 0 : video.path("height").asInt(0);
        if (width <= 0 || height <= 0) {
            throw new MediaException("There is no picture in this file");
        }
        double seconds;
        try {
            seconds = Double.parseDouble(json.path("format").path("duration").asString("0"));
        } catch (NumberFormatException e) {
            seconds = 0; // unknown, e.g. recorded in a browser: checked on the result
        }
        return new Info(width, height, seconds, audio, HDR_TRANSFERS.contains(video.path("color_transfer").asString("")));
    }

    /** Runs a command and returns its output. */
    private String run(List<String> command, Path folder, String failure) throws MediaException, IOException, InterruptedException {
        Path out = folder.resolve("out.txt");
        Path err = folder.resolve("err.txt");
        Process process = new ProcessBuilder(command)
                .redirectInput(ProcessBuilder.Redirect.from(Path.of("/dev/null").toFile()))
                .redirectOutput(out.toFile())
                .redirectError(err.toFile())
                .start();
        try {
            if (!process.waitFor(properties.timeout().toMillis(), TimeUnit.MILLISECONDS)) {
                log.warn("Media conversion took too long: {}", command);
                throw new MediaException("Converting took too long – please use a shorter or smaller file");
            }
        } finally {
            process.descendants().forEach(ProcessHandle::destroyForcibly);
            process.destroyForcibly();
        }
        if (process.exitValue() != 0) {
            log.info("Media conversion failed ({}): {}", process.exitValue(), head(err));
            throw new MediaException(failure);
        }
        return head(out);
    }

    /** Never more than a bit: the content comes from the file. */
    private static String head(Path file) throws IOException {
        try (InputStream in = Files.newInputStream(file)) {
            return new String(in.readNBytes(16_384), StandardCharsets.UTF_8);
        }
    }
}
