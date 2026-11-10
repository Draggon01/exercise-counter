package org.exercise.counter.exercisecounter.security;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The in-memory {@code user}/{@code password} login must only work with the {@code dev} profile.
 */
class DevUserLoginTest {

    static int login(int port) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/login"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("username=user&password=password"))
                .build();
        try (HttpClient client = HttpClient.newHttpClient()) {
            return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @Import(TestcontainersConfiguration.class)
    @ActiveProfiles("dev")
    class WithDevProfile {
        @LocalServerPort
        int port;

        @Test
        void devUserCanLogIn() throws Exception {
            assertEquals(200, login(port));
        }

        @Test
        void authenticatedPrincipalIsResolvedOverHttp() throws Exception {
            try (HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager()).build()) {
                client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/login"))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString("username=user&password=password"))
                        .build(), HttpResponse.BodyHandlers.discarding());

                HttpResponse<String> check = client.send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/check")).GET().build(),
                        HttpResponse.BodyHandlers.ofString());

                assertEquals(200, check.statusCode());
                assertTrue(check.body().contains("\"username\":\"user\""), check.body());
            }
        }

        @Test
        void anonymousUserInfoHasNoPrincipal() throws Exception {
            try (HttpClient client = HttpClient.newHttpClient()) {
                HttpResponse<String> info = client.send(
                        HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/public/userinfo"))
                                .GET().build(),
                        HttpResponse.BodyHandlers.ofString());

                assertEquals(200, info.statusCode());
                assertTrue(info.body().contains("\"anonymous\":true"), info.body());
            }
        }
    }

    @Nested
    @SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
    @Import(TestcontainersConfiguration.class)
    class WithoutDevProfile {
        @LocalServerPort
        int port;

        @Test
        void devUserCannotLogIn() throws Exception {
            assertEquals(401, login(port));
        }
    }
}
