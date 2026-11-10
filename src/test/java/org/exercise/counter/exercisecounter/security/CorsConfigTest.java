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
 * Allowed CORS origins come from {@code app.cors.allowed-origins}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.cors.allowed-origins=http://allowed.test,http://also-allowed.test")
@Import(TestcontainersConfiguration.class)
class CorsConfigTest {

    @LocalServerPort
    int port;

    @Test
    void configuredOrigin_isAllowed() throws Exception {
        HttpResponse<Void> res = preflight("http://also-allowed.test");

        assertEquals(200, res.statusCode());
        assertEquals("http://also-allowed.test", res.headers().firstValue("Access-Control-Allow-Origin").orElse(null));
        assertEquals("true", res.headers().firstValue("Access-Control-Allow-Credentials").orElse(null));
    }

    @Test
    void otherOrigin_isRejected() throws Exception {
        HttpResponse<Void> res = preflight("https://exercise-counter.de"); // default value, overridden here

        assertEquals(403, res.statusCode());
    }

    private HttpResponse<Void> preflight(String origin) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/public/userinfo"))
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .header("Origin", origin)
                .header("Access-Control-Request-Method", "GET")
                .build();
        try (HttpClient client = HttpClient.newHttpClient()) {
            return client.send(request, HttpResponse.BodyHandlers.discarding());
        }
    }
}
