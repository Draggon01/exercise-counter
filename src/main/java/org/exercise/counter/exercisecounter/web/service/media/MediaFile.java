package org.exercise.counter.exercisecounter.web.service.media;

/** The files a media item can have. */
public enum MediaFile {
    VIDEO(".mp4", "video/mp4"),
    /** the photo, or the preview of a video */
    IMAGE(".jpg", "image/jpeg");

    private final String suffix;
    private final String contentType;

    MediaFile(String suffix, String contentType) {
        this.suffix = suffix;
        this.contentType = contentType;
    }

    public String suffix() {
        return suffix;
    }

    public String contentType() {
        return contentType;
    }
}
