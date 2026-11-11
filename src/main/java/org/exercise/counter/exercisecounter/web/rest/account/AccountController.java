package org.exercise.counter.exercisecounter.web.rest.account;

import org.exercise.counter.exercisecounter.web.rest.account.dto.*;
import org.exercise.counter.exercisecounter.web.service.AccountService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Passwords: change your own, admins create reset links, the public reset page sets a new one. */
@RestController
@RequestMapping("/api")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PutMapping("/account/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@RequestBody ChangePasswordRequest request, @AuthenticationPrincipal UserDetails user) {
        accountService.changePassword(user.getUsername(), request.currentPassword(), request.newPassword());
    }

    @GetMapping("/admin/users")
    public List<String> users(@AuthenticationPrincipal UserDetails user) {
        return accountService.listUsernames(user.getUsername());
    }

    @PostMapping("/admin/password-resets")
    public PasswordResetLinkDto createResetLink(@RequestBody CreateResetLinkRequest request,
                                                @AuthenticationPrincipal UserDetails user) {
        return accountService.createResetLink(user.getUsername(), request.username(), request.baseUrl());
    }

    /** The token is the secret of the link – 404 if unknown, used or expired. */
    @GetMapping("/public/password-resets/{token}")
    public PasswordResetInfoDto resetInfo(@PathVariable String token) {
        return accountService.resetInfo(token);
    }

    @PostMapping("/public/password-resets/{token}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@PathVariable String token, @RequestBody ResetPasswordRequest request) {
        accountService.resetPassword(token, request.newPassword());
    }
}
