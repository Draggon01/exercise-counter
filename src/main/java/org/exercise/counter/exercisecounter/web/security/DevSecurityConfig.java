package org.exercise.counter.exercisecounter.web.security;

import org.exercise.counter.exercisecounter.web.data.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
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

    static final String DEV_USERNAME = "user";
    private static final String DEV_PASSWORD = "{noop}password";
    private static final Logger log = LoggerFactory.getLogger(DevSecurityConfig.class);

    @Bean
    public InMemoryUserDetailsManager devUserDetailsService() {
        UserDetails user = User
                .withUsername(DEV_USERNAME)
                .password(DEV_PASSWORD)
                .roles("USER")
                .build();
        return new InMemoryUserDetailsManager(user);
    }

    /**
     * Almost every table references {@code users(username)}, so the dev user also needs a row there –
     * otherwise every save (exercises, checks, options, ...) fails with a foreign key violation.
     */
    @Bean
    public ApplicationRunner devUserRow(UserRepository userRepository) {
        return args -> {
            if (userRepository.findByUsername(DEV_USERNAME).isEmpty()) {
                userRepository.save(new org.exercise.counter.exercisecounter.web.data.user.User(DEV_USERNAME, DEV_PASSWORD));
                log.info("Created dev user '{}' in the users table", DEV_USERNAME);
            }
        };
    }
}
