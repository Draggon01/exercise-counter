package org.exercise.counter.exercisecounter.web.rest.account.dto;

/** Deleting the account needs the password again. */
public record DeleteAccountRequest(String password) {
}
