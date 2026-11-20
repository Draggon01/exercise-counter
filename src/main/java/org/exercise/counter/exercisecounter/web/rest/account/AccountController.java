package org.exercise.counter.exercisecounter.web.rest.account;

import org.exercise.counter.exercisecounter.web.rest.account.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.exercise.counter.exercisecounter.web.security.UserSessions;
import org.exercise.counter.exercisecounter.web.service.AccountDeletionService;
import org.exercise.counter.exercisecounter.web.service.AccountService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Accounts: delete your own; passwords: change your own, admins create reset links, the public reset page sets a new one. */
@RestController
@RequestMapping("/api")
public class AccountController {

    private final AccountService accountService;
    private final AccountDeletionService deletionService;
    private final UserSessions userSessions;

    public AccountController(AccountService accountService, AccountDeletionService deletionService,
                             UserSessions userSessions) {
        this.accountService = accountService;
        this.deletionService = deletionService;
        this.userSessions = userSessions;
    }

    /** Deletes the own account (password needed) and logs out everywhere. */
    @DeleteMapping("/account")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@RequestBody DeleteAccountRequest request, @AuthenticationPrincipal UserDetails user,
                              HttpServletRequest httpRequest) {
        deletionService.deleteAccount(user.getUsername(), request.password());
        userSessions.endAll(user.getUsername());
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
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
