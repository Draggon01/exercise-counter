package org.exercise.counter.exercisecounter.web.service.media;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/** The command lines (argument lists, never a shell). Everything runs on one core with low priority. */
public class FfmpegCommands {

    /** 60 megapixels: every phone photo, but no decompression bomb. */
    static final long MAX_PHOTO_PIXELS = 60_000_000;
    /** 4K in both directions. */
    static final long MAX_VIDEO_PIXELS = 4096L * 2304;

    private final MediaProperties properties;

    public FfmpegCommands(MediaProperties properties) {
        this.properties = properties;
    }

    /** How much is kept, tried in this order until the file is small enough. */
    public record Attempt(int videoKbit, boolean sound) {
    }

    public List<Attempt> attempts() {
        int kbit = properties.videoKbit();
        return List.of(new Attempt(kbit, true), new Attempt(kbit / 2, true), new Attempt(kbit / 2, false));
    }

    public List<String> probe(Path input, MediaType type) {
        List<String> command = new ArrayList<>(List.of("nice", "-n", "15", properties.ffprobe(), "-v", "error"));
        command.addAll(input(input, type));
        command.addAll(List.of("-show_entries",
                "format=duration:stream=codec_type,width,height,color_transfer:stream_disposition=attached_pic", "-of", "json"));
        return command;
    }

    public List<String> video(Path input, MediaType type, Attempt attempt, boolean hdr, Path output) {
        List<String> command = ffmpeg(MAX_VIDEO_PIXELS);
        command.addAll(input(input, type));
        command.addAll(List.of("-map", "0:v:0"));
        if (attempt.sound()) {
            command.addAll(List.of("-map", "0:a:0?", "-c:a", "aac", "-ac", "1", "-b:a", "64k"));
        }
        int kbit = attempt.videoKbit();
        command.addAll(List.of("-map_metadata", "-1", "-map_chapters", "-1", "-dn", "-sn",
                "-vf", scale(properties.videoSize()) + (hdr ? "," + HDR_TO_SDR : "") + ",format=yuv420p",
                "-fpsmax", "30", "-c:v", properties.videoEncoder()));
        if (properties.videoEncoder().equals("libx264")) {
            command.addAll(List.of("-preset", "medium", "-profile:v", "high"));
        }
        command.addAll(List.of("-threads", "1",
                "-b:v", kbit + "k", "-maxrate", kbit * 3 / 2 + "k", "-bufsize", kbit * 2 + "k",
                // a little longer than allowed, so a longer one is noticed if its header lies
                "-t", String.valueOf(properties.maxDuration().toSeconds() + 2),
                "-fs", String.valueOf(properties.maxFile().toBytes() * 4),
                "-movflags", "+faststart", "-f", "mp4", output.toString()));
        return command;
    }

    /** A frame of a finished video. */
    public List<String> poster(Path video, double atSeconds, Path output) {
        List<String> command = ffmpeg(MAX_VIDEO_PIXELS);
        command.addAll(List.of("-ss", String.valueOf(atSeconds)));
        command.addAll(input(video, MediaType.MP4));
        command.addAll(List.of("-frames:v", "1", "-q:v", "4", "-update", "1", "-f", "image2", output.toString()));
        return command;
    }

    public List<String> photo(Path input, MediaType type, Path output) {
        List<String> command = ffmpeg(MAX_PHOTO_PIXELS);
        command.addAll(input(input, type));
        command.addAll(List.of("-map", "0:v:0", "-map_metadata", "-1", "-vf", scale(properties.photoSize()) + ",format=yuvj420p",
                "-frames:v", "1", "-q:v", "4", "-update", "1", "-f", "image2", output.toString()));
        return command;
    }

    private List<String> ffmpeg(long maxPixels) {
        return new ArrayList<>(List.of("nice", "-n", "15", properties.ffmpeg(), "-nostdin", "-hide_banner", "-v", "error",
                "-y", "-filter_threads", "1", "-threads", "1", "-max_pixels", String.valueOf(maxPixels)));
    }

    /** Only this file and only this format. */
    private static List<String> input(Path input, MediaType type) {
        return List.of("-protocol_whitelist", "file", "-f", type.demuxer(), "-i", input.toString());
    }

    /** Longest side at most {@code size}, never larger than the original, even numbers. */
    private static String scale(int size) {
        return "scale=w='if(gt(iw,ih),min(%1$d,trunc(iw/2)*2),-2)':h='if(gt(iw,ih),-2,min(%1$d,trunc(ih/2)*2))'".formatted(size);
    }

    private static final String HDR_TO_SDR = "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
            + "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv";
}
