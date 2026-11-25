package org.exercise.counter.exercisecounter.web.data.media;

public enum MediaStatus {
    /** uploaded, waiting for or in conversion */
    PROCESSING,
    READY,
    /** see the error text; the user has to upload again */
    FAILED
}
