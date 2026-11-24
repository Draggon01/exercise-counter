package org.exercise.counter.exercisecounter.web.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Text entered by users. */
final class PlainText {

    private PlainText() {
    }

    /** Trimmed, without NUL (PostgreSQL cannot store it); empty if missing, 400 if too long. */
    static String clean(String what, String value, int maxLength) {
        String text = value == null ? "" : value.replace("\u0000", "").strip();
        if (text.length() > maxLength) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    what + " can have up to " + maxLength + " characters");
        }
        return text;
    }
}
