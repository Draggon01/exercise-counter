package org.exercise.counter.exercisecounter.web.service.media;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.util.unit.DataSize;
import tools.jackson.databind.json.JsonMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** The tests with real conversions need ffmpeg (APP_MEDIA_FFMPEG / APP_MEDIA_FFPROBE) with libx264; otherwise skipped. */
class MediaProcessorTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String FFMPEG = env("APP_MEDIA_FFMPEG", "ffmpeg");
    private static final String FFPROBE = env("APP_MEDIA_FFPROBE", "ffprobe");

    @TempDir
    Path folder;

    @Test
    void readsWhatProbeSays() throws Exception {
        var info = MediaProcessor.info(JSON.readTree("""
                {"streams":[{"codec_type":"audio"},{"codec_type":"video","width":100,"height":90,"disposition":{"attached_pic":1}},
                {"codec_type":"video","width":1920,"height":1080,"color_transfer":"arib-std-b67"}],"format":{"duration":"3.5"}}"""));
        assertEquals(new MediaProcessor.Info(1920, 1080, 3.5, true, true), info);

        var unknownLength = MediaProcessor.info(JSON.readTree("{\"streams\":[{\"codec_type\":\"video\",\"width\":2,\"height\":2}],\"format\":{}}"));
        assertEquals(new MediaProcessor.Info(2, 2, 0, false, false), unknownLength);
        assertThrows(MediaException.class, () -> MediaProcessor.info(JSON.readTree("{\"streams\":[{\"codec_type\":\"audio\"}]}")));
        assertThrows(MediaException.class, () -> MediaProcessor.info(JSON.readTree("{}")));
    }

    @Test
    void commands_areRestricted_andGetSmallerStepByStep() {
        FfmpegCommands commands = new FfmpegCommands(properties("2MB"));
        assertEquals(List.of(new FfmpegCommands.Attempt(800, true), new FfmpegCommands.Attempt(400, true),
                new FfmpegCommands.Attempt(400, false)), commands.attempts());

        List<String> video = commands.video(Path.of("/x/upload"), MediaType.MP4, new FfmpegCommands.Attempt(400, false), false, Path.of("/x/video.mp4"));
        String text = String.join(" ", video);
        assertTrue(text.contains("-protocol_whitelist file -f mov -i /x/upload"), text);
        assertTrue(text.contains("-map_metadata -1") && text.contains("-b:v 400k"), text);
        assertFalse(text.contains("0:a:0") || text.contains("zscale"), text);
        assertTrue(String.join(" ", commands.video(Path.of("a"), MediaType.MP4, commands.attempts().getFirst(), true, Path.of("b"))).contains("tonemap"));
    }

    @Test
    void video_becomesSmall_keepsSound_losesMetadata() throws Exception {
        Path upload = generate("-f", "lavfi", "-i", "testsrc2=s=1280x720:r=60:d=3", "-f", "lavfi", "-i", "sine=d=3",
                "-c:v", "libx264", "-metadata", "location=+48.2+16.3/", "-f", "mp4");

        var result = processor("2MB").convert(upload, MediaType.MP4, folder);

        assertEquals(List.of(640, 360), List.of(result.width(), result.height()));
        assertEquals(3000, result.durationMs(), 150);
        assertTrue(result.hasAudio());
        assertTrue(result.sizeBytes() < 600_000, "size " + result.sizeBytes());
        assertTrue(Files.size(result.image()) > 1000);
        String probe = exec(List.of(FFPROBE, "-v", "error", "-show_entries", "format_tags", "-of", "flat", result.video().toString()));
        assertFalse(probe.contains("+48"), probe);
    }

    @Test
    void rotatedVideo_isTurned() throws Exception {
        Path plain = generate("-f", "lavfi", "-i", "testsrc2=s=640x360:r=30:d=2", "-c:v", "libx264", "-f", "mp4");
        Path rotated = folder.resolve("rotated");
        exec(List.of(FFMPEG, "-v", "error", "-y", "-display_rotation", "90", "-i", plain.toString(), "-c", "copy", "-f", "mp4", rotated.toString()));

        var result = processor("2MB").convert(rotated, MediaType.MP4, folder);

        assertEquals(List.of(360, 640), List.of(result.width(), result.height()));
        assertFalse(result.hasAudio());
    }

    @Test
    void hdrVideo_becomesSdr() throws Exception {
        Path upload = generate("-f", "lavfi", "-i", "testsrc2=s=640x360:r=30:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p10le",
                "-color_primaries", "bt2020", "-color_trc", "arib-std-b67", "-colorspace", "bt2020nc", "-f", "mp4");

        var result = processor("2MB").convert(upload, MediaType.MP4, folder);

        String probe = exec(List.of(FFPROBE, "-v", "error", "-show_entries", "stream=color_transfer,pix_fmt", "-of", "flat", result.video().toString()));
        assertTrue(probe.contains("yuv420p\"") && probe.contains("bt709"), probe);
    }

    @Test
    void tooLarge_dropsTheSound_thenFails() throws Exception {
        Path upload = generate("-f", "lavfi", "-i", "testsrc2=s=640x640:r=30:d=8", "-f", "lavfi", "-i", "sine=d=8", "-c:v", "libx264", "-f", "mp4");

        assertFalse(processor("450KB").convert(upload, MediaType.MP4, folder).hasAudio());
        assertTrue(assertThrows(MediaException.class, () -> processor("20KB").convert(upload, MediaType.MP4, folder))
                .getMessage().contains("too large"));
    }

    @Test
    void tooLong_fails() throws Exception {
        Path upload = generate("-f", "lavfi", "-i", "testsrc2=s=160x120:r=10:d=20", "-c:v", "libx264", "-f", "mp4");
        assertTrue(assertThrows(MediaException.class, () -> processor("2MB").convert(upload, MediaType.MP4, folder))
                .getMessage().contains("15 seconds"));
    }

    @Test
    void photo_isShrunk_turned_andLosesExif() throws Exception {
        Path plain = generate("-f", "lavfi", "-i", "testsrc2=s=1600x1200:d=1", "-frames:v", "1", "-f", "mjpeg");
        byte[] jpeg = Files.readAllBytes(plain);
        // EXIF: orientation 6 (turn right) and a readable text (Make)
        // TIFF header, 2 entries: Make (12 bytes at offset 38), orientation 6; no next directory
        byte[] exif = HexFormat.of().parseHex("ffe100" + "3a" + "457869660000" + "4d4d002a00000008" + "0002"
                + "010f00020000000c00000026" + "011200030000000100060000" + "00000000" + "534543524554504c41434500");
        Path upload = folder.resolve("photo");
        try (var out = Files.newOutputStream(upload)) {
            out.write(jpeg, 0, 2);
            out.write(exif);
            out.write(jpeg, 2, jpeg.length - 2);
        }

        var result = processor("2MB").convert(upload, MediaType.JPEG, folder);

        assertNull(result.video());
        assertNull(result.durationMs());
        assertEquals(List.of(960, 1280), List.of(result.width(), result.height()));
        String content = new String(Files.readAllBytes(result.image()), java.nio.charset.StandardCharsets.ISO_8859_1);
        assertFalse(content.contains("SECRETPLACE") || content.contains("Exif"));
    }

    @Test
    void garbage_fails() throws Exception {
        requireFfmpeg();
        Path upload = Files.writeString(folder.resolve("upload"), "\0\0\0\u0018ftypisom and then nothing useful");
        assertThrows(MediaException.class, () -> processor("2MB").convert(upload, MediaType.MP4, folder));
        Path playlist = Files.writeString(folder.resolve("upload2"), "#EXTM3U\nfile:///etc/passwd");
        assertThrows(MediaException.class, () -> processor("2MB").convert(playlist, MediaType.MP4, folder));
    }

    private Path generate(String... arguments) throws Exception {
        requireFfmpeg();
        Path file = folder.resolve("source");
        List<String> command = new ArrayList<>(List.of(FFMPEG, "-v", "error", "-y"));
        command.addAll(List.of(arguments));
        command.add(file.toString());
        exec(command);
        return file;
    }

    private static void requireFfmpeg() throws Exception {
        String encoders;
        try {
            encoders = exec(List.of(FFMPEG, "-v", "error", "-encoders"));
        } catch (java.io.IOException e) {
            encoders = "";
        }
        assumeTrue(encoders.contains("libx264"), "no ffmpeg with libx264");
    }

    private static String exec(List<String> command) throws Exception {
        Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
        String out = new String(process.getInputStream().readAllBytes());
        assertEquals(0, process.waitFor(), out);
        return out;
    }

    private MediaProcessor processor(String maxFile) {
        return new MediaProcessor(properties(maxFile), JSON);
    }

    private MediaProperties properties(String maxFile) {
        return new MediaProperties(folder.toString(), FFMPEG, FFPROBE, null, null, null, DataSize.parse(maxFile), null,
                null, null, null, null, Duration.ofMinutes(1));
    }

    private static String env(String name, String fallback) {
        return System.getenv().getOrDefault(name, fallback);
    }
}
