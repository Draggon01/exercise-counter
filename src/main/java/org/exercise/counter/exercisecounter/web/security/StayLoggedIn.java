package org.exercise.counter.exercisecounter.web.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.rememberme.TokenBasedRememberMeServices;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;

/**
 * Keeps users logged in when their server session is gone (idle for 30 minutes, deploy): a signed cookie that is
 * valid for {@link #VALIDITY} after the last use. The signature contains the password hash, so changing or resetting
 * the password and deleting the account make the cookies of all devices invalid.
 */
@Component
public class StayLoggedIn extends TokenBasedRememberMeServices {

    public static final String COOKIE = "stay-logged-in";
    public static final Duration VALIDITY = Duration.ofDays(60);

    /**
     * @param secureCookie {@code app.login.secure-cookie}: send the cookie over https only. Not derived from the
     *                     request, because the app runs behind a proxy that ends https.
     */
    public StayLoggedIn(JdbcTemplate jdbc, JpaUserDetailsService userDetailsService,
                        @Value("${app.login.secure-cookie:false}") boolean secureCookie) {
        super(signingKey(jdbc), userDetailsService);
        setAlwaysRemember(true);
        setCookieName(COOKIE);
        setTokenValiditySeconds((int) VALIDITY.toSeconds());
        setUseSecureCookie(secureCookie);
        setCookieCustomizer(cookie -> cookie.setAttribute("SameSite", "Lax"));
    }

    /** Every use starts the validity again. */
    @Override
    protected UserDetails processAutoLoginCookie(String[] cookieTokens, HttpServletRequest request,
                                                 HttpServletResponse response) {
        UserDetails user = super.processAutoLoginCookie(cookieTokens, request, response);
        renew(user.getUsername(), request, response);
        return user;
    }

    /** New cookie for this device, e.g. after the password was changed on it. */
    public void renew(String username, HttpServletRequest request, HttpServletResponse response) {
        // without credentials the current password hash is loaded
        onLoginSuccess(request, response, UsernamePasswordAuthenticationToken.authenticated(username, null, List.of()));
    }

    /** Created on the first start, kept in the database so a restart does not log everybody out. */
    private static String signingKey(JdbcTemplate jdbc) {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        jdbc.update("INSERT INTO app_secret (name, value) VALUES (?, ?) ON CONFLICT (name) DO NOTHING",
                COOKIE, HexFormat.of().formatHex(bytes));
        return jdbc.queryForObject("SELECT value FROM app_secret WHERE name = ?", String.class, COOKIE);
    }
}
