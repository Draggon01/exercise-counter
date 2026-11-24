package org.exercise.counter.exercisecounter.web.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JpaUserDetailsService userDetailsService;
    private final ObjectProvider<InMemoryUserDetailsManager> devUserDetailsService;
    private final List<String> allowedOrigins;
    private final StayLoggedIn stayLoggedIn;

    /**
     * @param devUserDetailsService only available with the {@code dev} profile, see {@link DevSecurityConfig}
     * @param allowedOrigins        {@code app.cors.allowed-origins} (comma separated)
     */
    public SecurityConfig(JpaUserDetailsService userDetailsService,
                          ObjectProvider<InMemoryUserDetailsManager> devUserDetailsService,
                          @Value("${app.cors.allowed-origins}") List<String> allowedOrigins,
                          StayLoggedIn stayLoggedIn) {
        this.userDetailsService = userDetailsService;
        this.devUserDetailsService = devUserDetailsService;
        this.allowedOrigins = allowedOrigins;
        this.stayLoggedIn = stayLoggedIn;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        InMemoryUserDetailsManager devUsers = devUserDetailsService.getIfAvailable();
        if (devUsers != null) {
            http.userDetailsService(devUsers);
        }
        return http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll()
                )
                // API clients need a 401 to detect an expired session, not a redirect to a login page
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .formLogin(form -> form
                        .loginProcessingUrl("/api/login")
                        .successHandler(successHandler())
                        .failureHandler(failureHandler())
                        .permitAll()
                )
                .userDetailsService(userDetailsService)
                .rememberMe(remember -> remember.rememberMeServices(stayLoggedIn).key(stayLoggedIn.getKey()))
                // known sessions per user, so deleting an account can end it on all devices (UserSessions)
                .sessionManagement(sessions -> sessions
                        .maximumSessions(-1)
                        .sessionRegistry(sessionRegistry())
                        .expiredSessionStrategy(event -> {
                            HttpServletResponse response = event.getResponse();
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"Session ended\"}");
                        }))
                .logout(logout -> logout
                        .logoutUrl("/api/logout")
                        .logoutSuccessHandler((_, response, _) -> {
                            response.setStatus(HttpServletResponse.SC_OK);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"message\":\"Logged out successfully\"}");
                        })
                        .permitAll()
                )
                .build();
    }


    private AuthenticationSuccessHandler successHandler() {
        return (_, response, _) -> {
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Login successful\"}");
        };
    }

    private AuthenticationFailureHandler failureHandler() {
        return (_, response, _) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Login failed\"}");
        };
    }

    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }

    /** Removes ended sessions (logout, timeout) from the {@link SessionRegistry}. */
    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // session cookie

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}