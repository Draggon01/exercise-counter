package org.exercise.counter.exercisecounter.web.service.media;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class MediaTypeTest {

    @Test
    void detectsByContent() {
        assertEquals(Optional.of(MediaType.MP4), detect("\0\0\0\u0018ftypisom"));
        assertEquals(Optional.of(MediaType.MP4), detect("\0\0\0\u0014ftypqt  "));
        assertEquals(Optional.of(MediaType.MP4), detect("\0\0\0\u0008wide\0\0\0\0"));
        assertEquals(Optional.of(MediaType.WEBM), detect("\u001aEß£00000000"));
        assertEquals(Optional.of(MediaType.JPEG), detect("ÿØÿà00000000"));
        assertEquals(Optional.of(MediaType.PNG), detect("\u0089PNG\r\n\u001a\n0000"));
        assertEquals(Optional.of(MediaType.WEBP), detect("RIFF0000WEBP"));
    }

    @Test
    void refusesEverythingElse() {
        for (String other : new String[]{"", "short", "<html><body>", "#EXTM3U\n#EXT-", "RIFF0000AVI ", "%PDF-1.7....", "ffconcat ver"}) {
            assertEquals(Optional.empty(), detect(other), other);
        }
    }

    @Test
    void recognizesHeic() {
        assertTrue(MediaType.isHeif(bytes("\0\0\0\u0018ftypheic")));
        assertEquals(Optional.empty(), detect("\0\0\0\u0018ftypheic"));
        assertFalse(MediaType.isHeif(bytes("\0\0\0\u0018ftypisom")));
    }

    private static Optional<MediaType> detect(String header) {
        return MediaType.detect(bytes(header));
    }

    private static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.ISO_8859_1);
    }
}
