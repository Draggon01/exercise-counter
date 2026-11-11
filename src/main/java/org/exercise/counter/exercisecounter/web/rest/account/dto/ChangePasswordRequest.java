package org.exercise.counter.exercisecounter.web.rest.account.dto;

public record ChangePasswordRequest(String currentPassword, String newPassword) {
}
