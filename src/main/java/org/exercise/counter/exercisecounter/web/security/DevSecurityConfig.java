package org.exercise.counter.exercisecounter.web.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

/**
 * Local development only: adds a login {@code user} / {@code password} next to the database users.
 * Activate with {@code mvn spring-boot:run -Dspring-boot.run.profiles=dev}
 * (or {@code SPRING_PROFILES_ACTIVE=dev}). Never enable this profile in production.
 */
@Configuration
@Profile("dev")
public class DevSecurityConfig {

    @Bean
    public InMemoryUserDetailsManager devUserDetailsService() {
        UserDetails user = User
                .withUsername("user")
                .password("{noop}password")
                .roles("USER")
                .build();
        return new InMemoryUserDetailsManager(user);
    }
}
