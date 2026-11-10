package org.exercise.counter.exercisecounter.security;

import org.exercise.counter.exercisecounter.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Protected API calls without a session must answer 401 (not a redirect to a login page),
 * otherwise the frontend cannot detect an expired session.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class UnauthenticatedApiTest {

    @LocalServerPort
    int port;

    @Test
    void authCheck_withoutSession_is401() throws Exception {
        assertEquals(401, get("/api/auth/check").statusCode());
    }

    @Test
    void protectedEndpoint_withoutSession_is401() throws Exception {
        assertEquals(401, get("/api/exercises/selected").statusCode());
    }

    private HttpResponse<String> get(String path) throws Exception {
        try (HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build()) {
            return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
        }
    }
}
