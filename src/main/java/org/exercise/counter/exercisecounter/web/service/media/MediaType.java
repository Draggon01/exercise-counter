package org.exercise.counter.exercisecounter.web.service.media;

import org.exercise.counter.exercisecounter.web.data.media.MediaKind;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.Set;

/**
 * What an uploaded file really is, by its first bytes (the name and Content-Type are never trusted). ffmpeg is told
 * this format, so it does not try any of its many others.
 */
public enum MediaType {
    MP4(MediaKind.VIDEO, "mov"),
    WEBM(MediaKind.VIDEO, "matroska"),
    JPEG(MediaKind.PHOTO, "jpeg_pipe"),
    PNG(MediaKind.PHOTO, "png_pipe"),
    WEBP(MediaKind.PHOTO, "webp_pipe");

    /** Enough for {@link #detect}. */
    public static final int HEADER_BYTES = 12;

    private static final Set<String> MOV_ATOMS = Set.of("ftyp", "moov", "mdat", "wide", "free", "skip");
    private static final Set<String> HEIF_BRANDS = Set.of("heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1", "avif", "avis");

    private final MediaKind kind;
    private final String demuxer;

    MediaType(MediaKind kind, String demuxer) {
        this.kind = kind;
        this.demuxer = demuxer;
    }

    public MediaKind kind() {
        return kind;
    }

    public String demuxer() {
        return demuxer;
    }

    /** HEIC / AVIF photos cannot be converted on the server. */
    public static boolean isHeif(byte[] header) {
        return header.length >= 12 && "ftyp".equals(text(header, 4)) && HEIF_BRANDS.contains(text(header, 8));
    }

    public static Optional<MediaType> detect(byte[] header) {
        if (header.length < HEADER_BYTES || isHeif(header)) {
            return Optional.empty();
        }
        if (MOV_ATOMS.contains(text(header, 4))) {
            return Optional.of(MP4);
        }
        if (startsWith(header, 0x1A, 0x45, 0xDF, 0xA3)) {
            return Optional.of(WEBM);
        }
        if (startsWith(header, 0xFF, 0xD8, 0xFF)) {
            return Optional.of(JPEG);
        }
        if (startsWith(header, 0x89, 'P', 'N', 'G')) {
            return Optional.of(PNG);
        }
        if ("RIFF".equals(text(header, 0)) && "WEBP".equals(text(header, 8))) {
            return Optional.of(WEBP);
        }
        return Optional.empty();
    }

    private static String text(byte[] header, int offset) {
        return new String(header, offset, 4, StandardCharsets.ISO_8859_1);
    }

    private static boolean startsWith(byte[] header, int... bytes) {
        for (int i = 0; i < bytes.length; i++) {
            if ((header[i] & 0xFF) != bytes[i]) {
                return false;
            }
        }
        return true;
    }
}
