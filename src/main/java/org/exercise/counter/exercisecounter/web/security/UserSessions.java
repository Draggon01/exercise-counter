package org.exercise.counter.exercisecounter.web.security;

import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/** Ends all sessions of a user (all devices), e.g. after the account was deleted. Their next request gets a 401. */
@Component
public class UserSessions {

    private final SessionRegistry sessionRegistry;

    public UserSessions(SessionRegistry sessionRegistry) {
        this.sessionRegistry = sessionRegistry;
    }

    public void endAll(String username) {
        sessionRegistry.getAllPrincipals().stream()
                .filter(principal -> principal instanceof UserDetails details && details.getUsername().equals(username))
                .flatMap(principal -> sessionRegistry.getAllSessions(principal, false).stream())
                .forEach(SessionInformation::expireNow);
    }
}
